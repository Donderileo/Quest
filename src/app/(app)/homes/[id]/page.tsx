import { notFound } from "next/navigation";
import Link from "next/link";
import { Plus, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const SPACE_ICONS: Record<string, string> = {
  kitchen: "🍳",
  bathroom: "🚿",
  living: "🛋️",
  bedroom: "🛏️",
  garden: "🌿",
  garage: "🚗",
};

export default async function HomePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: home }, { data: members }, { data: spaces }] =
    await Promise.all([
      supabase.from("homes").select("id, name, invite_code").eq("id", id).single(),
      supabase
        .from("home_members")
        .select("role, profiles(id, name, avatar_url)")
        .eq("home_id", id),
      supabase.from("spaces").select("id, name, icon, mode").eq("home_id", id),
    ]);

  if (!home) notFound();

  return (
    <div className="space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{home.name}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Código: <span className="font-mono font-semibold">{home.invite_code}</span>
          </p>
        </div>
        <Link
          href={`/homes/${id}/settings`}
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
        >
          <Settings className="size-5" />
        </Link>
      </div>

      {/* Membros */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Membros
        </h2>
        <div className="flex flex-wrap gap-3">
          {members?.map((m) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const p = (m.profiles as any) as { id: string; name: string; avatar_url: string | null };
            return (
              <div key={p.id} className="flex flex-col items-center gap-1">
                <Avatar name={p.name} src={p.avatar_url} size="md" />
                <span className="text-xs text-muted-foreground max-w-[56px] truncate">
                  {p.name.split(" ")[0]}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Ambientes */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Ambientes
          </h2>
          <Link
            href={`/homes/${id}/spaces/new`}
            className={cn(buttonVariants({ size: "icon", variant: "primary" }))}
            aria-label="Novo ambiente"
          >
            <Plus />
          </Link>
        </div>

        {!spaces?.length ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Nenhum ambiente ainda. Crie o primeiro!
            </CardContent>
          </Card>
        ) : (
          <ul className="grid grid-cols-2 gap-3">
            {spaces.map((space) => (
              <li key={space.id}>
                <Link href={`/spaces/${space.id}`}>
                  <Card className="active:scale-[0.98] transition-transform">
                    <CardHeader>
                      <span className="text-2xl">
                        {SPACE_ICONS[space.icon ?? ""] ?? "🏠"}
                      </span>
                      <CardTitle className="text-base">{space.name}</CardTitle>
                      {space.mode === "gamified" && (
                        <span className="text-xs text-gold font-semibold">
                          ★ Pontos
                        </span>
                      )}
                    </CardHeader>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
