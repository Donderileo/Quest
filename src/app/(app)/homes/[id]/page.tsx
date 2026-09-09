import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { BarChart3, ChevronRight, Plus, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { HomeSwitcher } from "@/components/home-switcher";
import { cn } from "@/lib/utils";

const SPACE_ICONS: Record<string, string> = {
  kitchen: "🍳", bathroom: "🚿", living: "🛋️",
  bedroom: "🛏️", garden: "🌿", garage: "🚗",
};

const SPACE_TINT: Record<string, string> = {
  kitchen: "#f3e7df", bathroom: "#e2e9f1", living: "#efe7f3",
  bedroom: "#f1ece2", garden: "#e6efe7", garage: "#e8eae6",
};

export default async function HomePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: home }, { data: members }, { data: spaces }, { data: myHomes }] =
    await Promise.all([
      supabase.from("homes").select("id, name, invite_code").eq("id", id).single(),
      supabase
        .from("home_members")
        .select("role, user_id, profiles(id, name, avatar_url)")
        .eq("home_id", id),
      supabase.from("spaces").select("id, name, icon, mode").eq("home_id", id),
      supabase
        .from("home_members")
        .select("joined_at, homes(id, name)")
        .eq("user_id", user!.id)
        .order("joined_at", { ascending: true }),
    ]);

  if (!home) notFound();

  const homes =
    myHomes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ?.map((m) => (m.homes as any) as { id: string; name: string })
      .filter(Boolean) ?? [];

  const spaceIds = spaces?.map((s) => s.id) ?? [];

  const [{ data: spaceMembers }, { data: tasks }, { data: dueToday }] =
    spaceIds.length
      ? await Promise.all([
          supabase
            .from("space_members")
            .select("space_id, profiles(name, avatar_url)")
            .in("space_id", spaceIds),
          supabase.from("tasks").select("id, space_id").in("space_id", spaceIds).is("archived_at", null),
          supabase
            .from("task_occurrences")
            .select("id, status, tasks!inner(space_id)")
            .eq("due_date", today)
            .eq("status", "pending"),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }];

  // mapas por space
  const membersBySpace = new Map<string, { name: string; avatar_url: string | null }[]>();
  for (const sm of spaceMembers ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = (sm.profiles as any) as { name: string; avatar_url: string | null };
    const arr = membersBySpace.get(sm.space_id) ?? [];
    if (p) arr.push(p);
    membersBySpace.set(sm.space_id, arr);
  }
  const taskCount = new Map<string, number>();
  for (const t of tasks ?? []) taskCount.set(t.space_id, (taskCount.get(t.space_id) ?? 0) + 1);
  const dueCount = new Map<string, number>();
  for (const o of dueToday ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sid = (o.tasks as any)?.space_id as string | undefined;
    if (sid) dueCount.set(sid, (dueCount.get(sid) ?? 0) + 1);
  }

  const memberCount = members?.length ?? 0;

  return (
    <div className="space-y-5 px-[22px] py-4">
      {/* header da casa com seletor */}
      <div className="flex items-center gap-3.5">
        <div className="flex size-[58px] shrink-0 items-center justify-center rounded-[17px] bg-primary shadow-[0_8px_18px_-6px_rgba(74,124,89,.6)]">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 11 L12 4 L20 11" /><path d="M6 10 V20 H18 V10" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <HomeSwitcher current={{ id: home.id, name: home.name }} homes={homes} />
          <p className="mt-1.5 text-[13.5px] font-semibold text-muted-foreground">
            {memberCount} {memberCount === 1 ? "membro" : "membros"} · {spaceIds.length} {spaceIds.length === 1 ? "ambiente" : "ambientes"}
          </p>
        </div>
      </div>

      {/* ações: convidar + métricas */}
      <div className="flex gap-2.5">
        <Link
          href={`/homes/${id}/invite`}
          className="flex h-[50px] flex-1 items-center justify-center gap-2 rounded-[15px] bg-primary text-[15px] font-bold text-primary-foreground shadow-[0_8px_18px_-7px_rgba(74,124,89,.5)] active:scale-[0.99] transition-transform"
        >
          <UserPlus className="size-[18px]" />
          Convidar
        </Link>
        <Link
          href={`/homes/${id}/dashboard`}
          className="flex h-[50px] flex-1 items-center justify-center gap-2 rounded-[15px] bg-card text-[15px] font-bold text-foreground shadow-[0_2px_7px_-3px_rgba(40,45,40,.07)] active:scale-[0.99] transition-transform"
        >
          <BarChart3 className="size-[18px]" />
          Métricas
        </Link>
      </div>

      {/* código de convite */}
      <div className="rounded-[15px] bg-card p-4 shadow-[0_2px_7px_-3px_rgba(40,45,40,.07)]">
        <div className="text-xs font-bold uppercase tracking-wide text-[#9aa09b]">Código de convite</div>
        <div className="mt-1 font-mono text-lg font-bold tracking-wider text-accent-foreground">{home.invite_code}</div>
      </div>

      {/* ambientes */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wide text-[#9aa09b]">
            Ambientes · {spaceIds.length}
          </span>
          <Link
            href={`/homes/${id}/spaces/new`}
            className={cn(buttonVariants({ size: "icon", variant: "primary" }), "size-9")}
            aria-label="Novo ambiente"
          >
            <Plus />
          </Link>
        </div>

        {!spaces?.length ? (
          <div className="rounded-[18px] border border-dashed border-[#d6d3ca] py-10 text-center text-sm text-muted-foreground">
            Nenhum ambiente ainda. Crie o primeiro!
          </div>
        ) : (
          <div className="space-y-3">
            {spaces.map((space) => {
              const mem = membersBySpace.get(space.id) ?? [];
              const tCount = taskCount.get(space.id) ?? 0;
              const due = dueCount.get(space.id) ?? 0;
              const tint = SPACE_TINT[space.icon ?? ""] ?? "#e8eae6";
              return (
                <Link
                  key={space.id}
                  href={`/spaces/${space.id}`}
                  className="block rounded-[18px] bg-card p-4 shadow-[0_2px_8px_-3px_rgba(40,45,40,.08)] active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex size-[46px] shrink-0 items-center justify-center rounded-[13px] text-2xl"
                      style={{ backgroundColor: tint }}
                    >
                      {SPACE_ICONS[space.icon ?? ""] ?? "🏠"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[17px] font-bold tracking-tight">{space.name}</span>
                        {space.mode === "gamified" && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-foreground">
                            <span className="inline-block size-1.5 rotate-45 bg-primary" />
                            Pontos
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[13px] font-medium text-muted-foreground">
                        {mem.length} {mem.length === 1 ? "membro" : "membros"} · {tCount} {tCount === 1 ? "tarefa" : "tarefas"}
                      </div>
                    </div>
                    <ChevronRight className="size-5 shrink-0 text-[#c2c6c0]" />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex">
                      {mem.slice(0, 4).map((p, i) => (
                        <Avatar
                          key={i}
                          name={p.name}
                          src={p.avatar_url}
                          size="sm"
                          className={cn("size-[27px] border-2 border-card text-[11px]", i > 0 && "-ml-2.5")}
                        />
                      ))}
                      {mem.length === 0 && (
                        <span className="text-[12.5px] font-medium text-muted-foreground">Sem membros</span>
                      )}
                    </div>
                    {due > 0 ? (
                      <span className="rounded-[9px] bg-[#fbeee8] px-2.5 py-1 text-[12.5px] font-bold text-[#c0623a]">
                        {due} p/ hoje
                      </span>
                    ) : tCount > 0 ? (
                      <span className="rounded-[9px] bg-[#eef1ed] px-2.5 py-1 text-[12.5px] font-bold text-[#7d847e]">
                        Tudo em dia
                      </span>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* membros da casa */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wide text-[#9aa09b]">
            Membros · {memberCount}
          </span>
          <Link href={`/homes/${id}/members`} className="text-[13px] font-bold text-primary">
            Gerenciar
          </Link>
        </div>
        <div className="overflow-hidden rounded-[16px] bg-card shadow-[0_2px_7px_-3px_rgba(40,45,40,.07)]">
          {members?.map((m, i) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const p = (m.profiles as any) as { id: string; name: string; avatar_url: string | null };
            return (
              <div key={p.id}>
                {i > 0 && <div className="mx-[15px] h-px bg-[#f0efe9]" />}
                <div className="flex items-center gap-3 px-[15px] py-3">
                  <Avatar name={p.name} src={p.avatar_url} size="md" className="size-[34px] text-[13px]" />
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="text-[15px] font-bold">{p.name}</span>
                    {m.role !== "member" && (
                      <span className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-bold capitalize text-accent-foreground">
                        {m.role === "owner" ? "Dono" : "Admin"}
                      </span>
                    )}
                  </div>
                  <ChevronRight className="size-4 text-[#c2c6c0]" />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
