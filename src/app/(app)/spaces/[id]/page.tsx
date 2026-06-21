import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trophy } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { TaskCard } from "@/components/task-card";
import { cn } from "@/lib/utils";

export default async function SpacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const today = format(new Date(), "yyyy-MM-dd");

  const [{ data: space }, { data: occurrences }, { data: points }] =
    await Promise.all([
      supabase
        .from("spaces")
        .select("id, name, icon, mode, home_id")
        .eq("id", id)
        .single(),
      supabase
        .from("task_occurrences")
        .select("id, due_date, status, assigned_to, tasks(title, points), profiles(name, avatar_url)")
        .eq("tasks.space_id", id)
        .gte("due_date", today)
        .order("due_date", { ascending: true })
        .limit(30),
      supabase
        .from("space_member_points")
        .select("total_points, profiles(name, avatar_url)")
        .eq("space_id", id)
        .order("total_points", { ascending: false }),
    ]);

  if (!space) notFound();

  const SPACE_ICONS: Record<string, string> = {
    kitchen: "🍳", bathroom: "🚿", living: "🛋️",
    bedroom: "🛏️", garden: "🌿", garage: "🚗",
  };

  return (
    <div className="space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/homes/${space.home_id}`} className="text-muted-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        <span className="text-2xl">{SPACE_ICONS[space.icon ?? ""] ?? "🏠"}</span>
        <h1 className="text-xl font-bold">{space.name}</h1>
      </div>

      {/* Leaderboard (só gamificado) */}
      {space.mode === "gamified" && points && points.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-gold" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Pontuação
            </h2>
          </div>
          <ul className="flex gap-3 overflow-x-auto pb-1">
            {points.map((p, i) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const profile = (p.profiles as any) as { name: string; avatar_url: string | null };
              return (
                <li key={i} className="flex flex-col items-center gap-1 min-w-[56px]">
                  <Avatar name={profile.name} src={profile.avatar_url} size="md" />
                  <span className="text-xs font-semibold text-gold">{p.total_points}pts</span>
                  <span className="text-xs text-muted-foreground truncate max-w-[56px]">
                    {profile.name.split(" ")[0]}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Tarefas */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Próximas tarefas
          </h2>
          <Link
            href={`/tasks/new?spaceId=${id}`}
            className={cn(buttonVariants({ size: "icon", variant: "primary" }))}
            aria-label="Nova tarefa"
          >
            <Plus />
          </Link>
        </div>

        {!occurrences?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma tarefa pendente. 🎉
          </p>
        ) : (
          <ul className="space-y-2">
            {occurrences.map((occ) => (
              <TaskCard key={occ.id} occurrence={occ} gamified={space.mode === "gamified"} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
