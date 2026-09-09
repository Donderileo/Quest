import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui/avatar";

const SPACE_DOT: Record<string, string> = {
  kitchen: "#c07a4f", bathroom: "#6d7fa8", living: "#a87faa",
  bedroom: "#c0913f", garden: "#4a7c59", garage: "#7d847e",
};

export default async function MembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: home }, { data: members }, { data: spaces }] = await Promise.all([
    supabase.from("homes").select("id, name").eq("id", id).single(),
    supabase
      .from("home_members")
      .select("role, user_id, profiles(id, name, avatar_url)")
      .eq("home_id", id),
    supabase.from("spaces").select("id, name, icon").eq("home_id", id),
  ]);

  if (!home) notFound();

  const spaceIds = spaces?.map((s) => s.id) ?? [];
  const { data: spaceMembers } = spaceIds.length
    ? await supabase.from("space_members").select("space_id, user_id").in("space_id", spaceIds)
    : { data: [] };

  const spaceById = new Map(spaces?.map((s) => [s.id, s]) ?? []);
  const spacesByUser = new Map<string, { name: string; icon: string | null }[]>();
  for (const sm of spaceMembers ?? []) {
    const sp = spaceById.get(sm.space_id);
    if (!sp) continue;
    const arr = spacesByUser.get(sm.user_id) ?? [];
    arr.push({ name: sp.name, icon: sp.icon });
    spacesByUser.set(sm.user_id, arr);
  }

  const memberCount = members?.length ?? 0;

  return (
    <div className="px-[22px] py-4">
      <div className="flex items-center justify-between">
        <Link
          href={`/homes/${id}`}
          className="flex size-10 items-center justify-center rounded-xl bg-card shadow-[0_2px_6px_-2px_rgba(0,0,0,.12)]"
          aria-label="Voltar"
        >
          <ChevronRight className="size-5 rotate-180" />
        </Link>
        <span className="text-[17px] font-extrabold tracking-tight">Membros</span>
        <span className="size-10" />
      </div>
      <p className="mt-2 text-[13px] font-semibold text-muted-foreground">
        {home.name} · {memberCount} {memberCount === 1 ? "pessoa" : "pessoas"}
      </p>

      <div className="mt-4 mb-3 text-xs font-bold uppercase tracking-wide text-[#9aa09b]">
        Quem está em cada ambiente
      </div>

      <div className="space-y-2.5">
        {members?.map((m) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const p = (m.profiles as any) as { id: string; name: string; avatar_url: string | null };
          const userSpaces = spacesByUser.get(p.id) ?? [];
          return (
            <div
              key={p.id}
              className="rounded-[16px] bg-card p-[14px] shadow-[0_2px_7px_-3px_rgba(40,45,40,.07)]"
            >
              <div className="flex items-center gap-3">
                <Avatar name={p.name} src={p.avatar_url} size="md" className="size-9 text-[13px]" />
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="text-[15.5px] font-bold">{p.name}</span>
                  {m.role !== "member" && (
                    <span className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground">
                      {m.role === "owner" ? "Dono" : "Admin"}
                    </span>
                  )}
                </div>
                <ChevronRight className="size-4 text-[#c2c6c0]" />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 pl-12">
                {userSpaces.length ? (
                  userSpaces.map((s, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-background px-2.5 py-1.5 text-[12.5px] font-bold text-[#4b504b]"
                    >
                      <span
                        className="inline-block size-[7px] rounded-sm"
                        style={{ backgroundColor: SPACE_DOT[s.icon ?? ""] ?? "#9aa09b" }}
                      />
                      {s.name}
                    </span>
                  ))
                ) : (
                  <span className="text-[12.5px] font-medium text-muted-foreground">Nenhum ambiente</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
