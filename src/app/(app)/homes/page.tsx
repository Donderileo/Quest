import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default async function HomesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: memberships } = await supabase
    .from("home_members")
    .select("home_id, role, homes(id, name)")
    .eq("user_id", user!.id);

  const homes = memberships?.map((m) => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...((m.homes as any) as { id: string; name: string }),
    role: m.role,
  })) ?? [];

  return (
    <div className="space-y-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Suas casas</h1>
        <Link
          href="/homes/new"
          className={cn(buttonVariants({ size: "icon", variant: "primary" }))}
          aria-label="Nova casa"
        >
          <Plus />
        </Link>
      </div>

      {homes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-12 text-center">
          <p className="text-muted-foreground text-sm">
            Você ainda não tem nenhuma casa.
          </p>
          <Link
            href="/homes/new"
            className={cn(buttonVariants({ variant: "primary", size: "md" }))}
          >
            Criar minha primeira casa
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {homes.map((home) => (
            <li key={home.id}>
              <Link href={`/homes/${home.id}`}>
                <Card className="active:scale-[0.99] transition-transform">
                  <CardHeader>
                    <CardTitle>{home.name}</CardTitle>
                    <p className="text-xs text-muted-foreground capitalize">
                      {home.role}
                    </p>
                  </CardHeader>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
