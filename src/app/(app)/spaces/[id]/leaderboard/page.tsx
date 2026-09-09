import { notFound, redirect } from "next/navigation";
import { startOfWeek } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { Leaderboard, type RankEntry, type Activity } from "./leaderboard";

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: space } = await supabase
    .from("spaces")
    .select("id, name, icon, mode, home_id, homes(name)")
    .eq("id", id)
    .single();

  if (!space) notFound();
  if (space.mode !== "gamified") redirect(`/spaces/${id}`);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString();

  const [{ data: allTime }, { data: members }, { data: doneThisWeek }, { data: recent }] =
    await Promise.all([
      supabase
        .from("space_member_points")
        .select("user_id, total_points, profiles(name, avatar_url)")
        .eq("space_id", id)
        .order("total_points", { ascending: false }),
      supabase.from("space_members").select("profiles(id, name, avatar_url)").eq("space_id", id),
      supabase
        .from("task_occurrences")
        .select("points_awarded, completed_by, tasks!inner(space_id)")
        .eq("tasks.space_id", id)
        .eq("status", "done")
        .gte("completed_at", weekStart),
      supabase
        .from("task_occurrences")
        .select("id, points_awarded, completed_at, tasks!inner(title, space_id), completer:profiles!task_occurrences_completed_by_fkey(name, avatar_url)")
        .eq("tasks.space_id", id)
        .eq("status", "done")
        .order("completed_at", { ascending: false })
        .limit(8),
    ]);

  // all-time ranking
  const allTimeRank: RankEntry[] =
    allTime?.map((r) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = (r.profiles as any) as { name: string; avatar_url: string | null };
      return { name: p?.name ?? "—", avatar_url: p?.avatar_url ?? null, points: r.total_points };
    }) ?? [];

  // weekly ranking: agrega por pessoa, incluindo membros com 0
  const weekByUser = new Map<string, number>();
  for (const o of doneThisWeek ?? []) {
    if (!o.completed_by) continue;
    weekByUser.set(o.completed_by, (weekByUser.get(o.completed_by) ?? 0) + (o.points_awarded ?? 0));
  }
  const weeklyRank: RankEntry[] = (members ?? [])
    .map((m) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = (m.profiles as any) as { id: string; name: string; avatar_url: string | null };
      return { name: p?.name ?? "—", avatar_url: p?.avatar_url ?? null, points: weekByUser.get(p?.id) ?? 0 };
    })
    .sort((a, b) => b.points - a.points);

  const activity: Activity[] =
    recent?.map((o) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c = (o.completer as any) as { name: string; avatar_url: string | null } | null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const t = (o.tasks as any) as { title: string };
      return {
        name: c?.name ?? "Alguém",
        avatar_url: c?.avatar_url ?? null,
        title: t?.title ?? "",
        points: o.points_awarded ?? 0,
      };
    }) ?? [];

  return (
    <Leaderboard
      spaceId={space.id}
      spaceName={space.name}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      homeName={(space.homes as any)?.name ?? null}
      icon={space.icon}
      weekly={weeklyRank}
      allTime={allTimeRank}
      activity={activity}
    />
  );
}
