import { notFound } from "next/navigation";
import { startOfWeek, isToday, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { HouseDashboard, type PersonStats } from "./house-dashboard";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: home }, { data: members }, { data: spaces }] = await Promise.all([
    supabase.from("homes").select("id, name").eq("id", id).single(),
    supabase.from("home_members").select("profiles(id, name, avatar_url)").eq("home_id", id),
    supabase.from("spaces").select("id").eq("home_id", id),
  ]);

  if (!home) notFound();

  const spaceIds = spaces?.map((s) => s.id) ?? [];

  const { data: done } = spaceIds.length
    ? await supabase
        .from("task_occurrences")
        .select("completed_by, completed_at, points_awarded, tasks!inner(space_id)")
        .in("tasks.space_id", spaceIds)
        .eq("status", "done")
    : { data: [] };

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  // inicializa stats por pessoa
  const stats = new Map<string, PersonStats>();
  for (const m of members ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = (m.profiles as any) as { id: string; name: string; avatar_url: string | null };
    if (p) stats.set(p.id, { name: p.name, avatar_url: p.avatar_url, today: 0, week: 0, all: 0, points: 0 });
  }

  let totalToday = 0;
  let totalWeek = 0;
  for (const o of done ?? []) {
    if (!o.completed_by) continue;
    const s = stats.get(o.completed_by);
    if (!s) continue;
    const when = o.completed_at ? parseISO(o.completed_at) : null;
    s.all += 1;
    s.points += o.points_awarded ?? 0;
    if (when && when >= weekStart) {
      s.week += 1;
      totalWeek += 1;
    }
    if (when && isToday(when)) {
      s.today += 1;
      totalToday += 1;
    }
  }

  const people = [...stats.values()];

  return (
    <HouseDashboard
      homeId={id}
      homeName={home.name}
      people={people}
      totalToday={totalToday}
      totalWeek={totalWeek}
    />
  );
}
