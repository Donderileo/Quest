import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Plus, Settings, Trophy } from "lucide-react";
import { format, addDays } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui/avatar";
import { SpaceTasks } from "@/components/space-tasks";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { cn } from "@/lib/utils";

const SPACE_ICONS: Record<string, string> = {
  kitchen: "🍳", bathroom: "🚿", living: "🛋️",
  bedroom: "🛏️", garden: "🌿", garage: "🚗",
};

const SPACE_TINT: Record<string, string> = {
  kitchen: "#f3e7df", bathroom: "#e2e9f1", living: "#efe7f3",
  bedroom: "#f1ece2", garden: "#e6efe7", garage: "#e8eae6",
};

export default async function SpacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const weekEnd = format(addDays(new Date(), 6), "yyyy-MM-dd");

  const [{ data: space }, { data: tasks }, { data: occurrences }, { data: points }, { data: spaceMembers }] =
    await Promise.all([
      supabase
        .from("spaces")
        .select("id, name, icon, mode, home_id, homes(name)")
        .eq("id", id)
        .single(),
      supabase
        .from("tasks")
        .select("id, title, recurrence_type, recurrence_days, recurrence_interval_days, assignment_type, assignee_id, points, assignee:profiles!tasks_assignee_id_fkey(name)")
        .eq("space_id", id)
        .is("archived_at", null)
        .order("created_at", { ascending: true }),
      supabase
        .from("task_occurrences")
        .select("id, task_id, due_date, status, completed_at, tasks!inner(title, points, space_id), assignee:profiles!task_occurrences_assigned_to_fkey(name, avatar_url), completer:profiles!task_occurrences_completed_by_fkey(name)")
        .eq("tasks.space_id", id)
        .gte("due_date", today)
        .lte("due_date", weekEnd)
        .order("due_date", { ascending: true }),
      supabase
        .from("space_member_points")
        .select("total_points, profiles(name, avatar_url)")
        .eq("space_id", id)
        .order("total_points", { ascending: false }),
      supabase
        .from("space_members")
        .select("profiles(name, avatar_url)")
        .eq("space_id", id),
    ]);

  if (!space) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const homeName = (space.homes as any)?.name as string | undefined;
  const members =
    spaceMembers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ?.map((sm) => (sm.profiles as any) as { name: string; avatar_url: string | null })
      .filter(Boolean) ?? [];
  const tint = SPACE_TINT[space.icon ?? ""] ?? "#e8eae6";

  return (
    <div className="space-y-6 px-[22px] py-4">
      <RealtimeRefresh />
      {/* topo: voltar + editar */}
      <div className="flex items-center justify-between">
        <Link
          href={`/homes/${space.home_id}`}
          className="flex size-10 items-center justify-center rounded-xl bg-card shadow-[0_2px_6px_-2px_rgba(0,0,0,.12)]"
          aria-label="Voltar"
        >
          <ChevronRight className="size-5 rotate-180" />
        </Link>
        <Link
          href={`/spaces/${space.id}/edit`}
          className="flex size-10 items-center justify-center rounded-xl bg-card shadow-[0_2px_6px_-2px_rgba(0,0,0,.12)]"
          aria-label="Editar ambiente"
        >
          <Settings className="size-5" />
        </Link>
      </div>

      {/* header do ambiente */}
      <div className="flex items-center gap-3">
        <div
          className="flex size-[50px] shrink-0 items-center justify-center rounded-[15px] text-2xl"
          style={{ backgroundColor: tint }}
        >
          {SPACE_ICONS[space.icon ?? ""] ?? "🏠"}
        </div>
        <div className="min-w-0">
          {homeName && (
            <div className="text-xs font-bold text-muted-foreground">{homeName}</div>
          )}
          <h1 className="text-[26px] font-extrabold leading-tight tracking-tight">{space.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <div className="flex">
              {members.slice(0, 4).map((p, i) => (
                <Avatar
                  key={i}
                  name={p.name}
                  src={p.avatar_url}
                  size="sm"
                  className={cn("size-5 border-[1.5px] border-background text-[9px]", i > 0 && "-ml-1.5")}
                />
              ))}
            </div>
            <span className="text-[13px] font-semibold text-muted-foreground">
              {members.length} {members.length === 1 ? "membro" : "membros"}
            </span>
          </div>
        </div>
      </div>

      {space.mode === "gamified" && points && points.length > 0 && (() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const leader = (points[0].profiles as any) as { name: string; avatar_url: string | null };
        const gap = points.length > 1 ? points[0].total_points - points[1].total_points : 0;
        return (
          <section className="space-y-3">
            {/* card do líder → ranking completo */}
            <Link
              href={`/spaces/${space.id}/leaderboard`}
              className="relative flex items-center gap-4 overflow-hidden rounded-[22px] bg-primary p-5 shadow-[0_14px_30px_-12px_rgba(74,124,89,.6)] active:scale-[0.99] transition-transform"
            >
              <div className="absolute -right-8 -top-8 size-28 rounded-full bg-white/[0.07]" />
              <Avatar name={leader.name} src={leader.avatar_url} size="lg" className="size-14 bg-white !text-primary text-xl" />
              <div className="flex-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-white/80">
                  <Trophy className="size-3.5" /> Liderando
                </div>
                <div className="text-[22px] font-extrabold tracking-tight text-white">{leader.name}</div>
                {gap > 0 && (
                  <div className="text-[13px] font-semibold text-white/80">À frente por {gap} pontos</div>
                )}
              </div>
              <div className="text-right">
                <div className="text-3xl font-extrabold leading-none tracking-tight text-white">{points[0].total_points}</div>
                <div className="text-xs font-semibold text-white/80">pontos</div>
              </div>
            </Link>

            {/* ranking */}
            <div className="space-y-[9px]">
              {points.map((p, i) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const profile = (p.profiles as any) as { name: string; avatar_url: string | null };
                return (
                  <div key={i} className="flex items-center gap-3 rounded-[15px] bg-card p-[13px] shadow-[0_2px_7px_-3px_rgba(40,45,40,.07)]">
                    <span className={cn("w-5 text-center text-[15px] font-extrabold", i === 0 ? "text-primary" : "text-[#9aa09b]")}>
                      {i + 1}
                    </span>
                    <Avatar name={profile.name} src={profile.avatar_url} size="md" className="size-[34px] text-[13px]" />
                    <span className="flex-1 text-[15.5px] font-bold">{profile.name}</span>
                    <span className="text-[15px] font-extrabold">{p.total_points}</span>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })()}

      <SpaceTasks
        today={today}
        gamified={space.mode === "gamified"}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tasks={(tasks as any) ?? []}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        occurrences={(occurrences as any) ?? []}
      />

      {/* FAB nova tarefa */}
      <Link
        href={`/tasks/new?spaceId=${id}`}
        className="fixed bottom-[88px] right-5 z-40 flex h-[54px] items-center gap-2 rounded-[17px] bg-primary pl-[18px] pr-[22px] text-[15px] font-bold text-primary-foreground shadow-[0_12px_26px_-8px_rgba(74,124,89,.6)] active:scale-[0.97] transition-transform"
      >
        <Plus className="size-5" strokeWidth={2.6} />
        Nova tarefa
      </Link>
    </div>
  );
}
