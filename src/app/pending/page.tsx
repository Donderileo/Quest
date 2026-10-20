import { redirect } from "next/navigation";
import { Clock, ShieldOff } from "lucide-react";
import { getAccess } from "@/lib/access";
import { PendingWatch } from "@/components/pending-watch";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/(auth)/actions";
import { getCurrentUser } from "@/lib/auth";

export default async function PendingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const access = await getAccess();
  if (access?.status === "approved") redirect("/homes");
  const blocked = access?.status === "blocked";

  return (
    <div className="flex flex-1 flex-col">
      <div className="h-1.5 w-full bg-primary" />
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-12 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-accent text-accent-foreground">
          {blocked ? <ShieldOff className="size-7" /> : <Clock className="size-7" />}
        </div>
        <div className="max-w-xs space-y-2">
          <h1 className="text-2xl font-bold">
            {blocked ? "Acesso suspenso" : "Aguardando liberação"}
          </h1>
          <p className="text-muted-foreground">
            {blocked
              ? "O seu acesso ao Tend foi suspenso. Fale com quem te convidou."
              : "Seu e-mail foi confirmado. Assim que o acesso for liberado, você entra aqui automaticamente."}
          </p>
          <p className="text-xs text-subtle">{user.email}</p>
        </div>
        {!blocked && <PendingWatch />}
        <form action={signOut}>
          <Button type="submit" variant="outline">
            Sair
          </Button>
        </form>
      </main>
    </div>
  );
}
