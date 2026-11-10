import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { spaceEmoji } from "@/lib/space-icon";
import { NewTaskForm } from "./new-task-form";

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ spaceId?: string; once?: string }>;
}) {
  const { spaceId, once } = await searchParams;
  const isOnce = once === "1";
  const supabase = await createClient();

  // sem ambiente (vindo do "Nova tarefa" da tela de Tarefas): escolher onde. Com um só ambiente, pula a escolha.
  if (!spaceId) {
    const { data: all } = await supabase
      .from("spaces")
      .select("id, name, icon, home_id, homes(name)")
      .order("created_at");
    if (!all?.length) redirect("/homes");
    const next = (id: string) => `/tasks/new?spaceId=${id}${isOnce ? "&once=1" : ""}`;
    if (all.length === 1) redirect(next(all[0].id));

    const manyHomes = new Set(all.map((s) => s.home_id)).size > 1;
    return (
      <div className="space-y-4 px-[22px] pb-8 pt-2">
        <div>
          <h1 className="text-xl font-extrabold">Nova tarefa</h1>
          <p className="text-sm text-muted-foreground">Em qual ambiente?</p>
        </div>
        <div className="flex flex-col gap-2">
          {all.map((s) => (
            <Link
              key={s.id}
              href={next(s.id)}
              className="press flex items-center gap-3 rounded-[15px] bg-card p-3.5 shadow-[0_2px_7px_-3px_rgba(40,45,40,.07)]"
            >
              <span className="text-2xl">{spaceEmoji(s.icon)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{s.name}</span>
                {manyHomes && (
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  <span className="block truncate text-xs text-muted-foreground">{(s.homes as any)?.name}</span>
                )}
              </span>
              <ChevronRight className="size-4 text-faint" />
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const [{ data: space }, { data: spaceMembers }] = await Promise.all([
    supabase.from("spaces").select("id, name, mode, home_id").eq("id", spaceId).single(),
    supabase
      .from("space_members")
      .select("profiles(id, name, avatar_url)")
      .eq("space_id", spaceId),
  ]);

  if (!space) notFound();

  // fallback: se o ambiente não tem membros cadastrados, usa os membros da casa
  let members =
    spaceMembers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ?.map((sm) => (sm.profiles as any) as { id: string; name: string; avatar_url: string | null })
      .filter(Boolean) ?? [];

  if (members.length === 0) {
    const { data: homeMembers } = await supabase
      .from("home_members")
      .select("profiles(id, name, avatar_url)")
      .eq("home_id", space.home_id);
    members =
      homeMembers
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ?.map((hm) => (hm.profiles as any) as { id: string; name: string; avatar_url: string | null })
        .filter(Boolean) ?? [];
  }

  const user = await getCurrentUser();
  return (
    <NewTaskForm
      spaceId={space.id}
      gamified={space.mode === "gamified"}
      members={members}
      once={isOnce}
      // avulsa criada na hora: por padrão é de quem está criando
      defaultAssigneeId={isOnce && members.some((m) => m.id === user?.id) ? user!.id : null}
    />
  );
}
