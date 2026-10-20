import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeSwitch } from "@/components/theme-switch";
import { signOut } from "@/app/(auth)/actions";
import { getCurrentUser } from "@/lib/auth";
import { getAppVersion } from "@/lib/version";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default async function ProfilePage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, avatar_url")
    .eq("id", user.id)
    .single();

  const access = await getAccess();
  const name = profile?.name ?? user.email ?? "Usuário";
  const app = getAppVersion();

  return (
    <div className="px-4 py-10 space-y-8">
      <div className="flex flex-col items-center gap-3">
        <Avatar name={name} src={profile?.avatar_url} size="lg" />
        <div className="text-center">
          <p className="text-lg font-bold">{name}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      {access?.isAdmin && (
        <Link href="/admin" className="press block rounded-[15px] bg-card p-4 font-bold shadow-[0_2px_7px_-3px_rgba(40,45,40,.07)]">
          Gerenciar acessos
        </Link>
      )}

      <ThemeSwitch />

      <form action={signOut}>
        <Button type="submit" variant="outline" className="w-full">
          Sair
        </Button>
      </form>

      {/* versão em execução: só o admin vê (útil para conferir o que está no ar) */}
      {access?.isAdmin && (
        <p className="text-center text-xs text-subtle">
          Tend v{app.version} · {app.commit}
          {app.builtAt && ` · ${format(parseISO(app.builtAt), "d MMM yyyy, HH:mm", { locale: ptBR })}`}
        </p>
      )}
    </div>
  );
}
