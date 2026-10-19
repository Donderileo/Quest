import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { BottomNav } from "@/components/bottom-nav";
import { ToastProvider } from "@/components/toast";
import { InstallPrompt } from "@/components/install-prompt";

export default async function AppLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // acesso só após aprovação do admin (o banco também bloqueia; isto é a UX)
  const access = await getAccess(supabase);
  if (access?.status !== "approved") redirect("/pending");

  return (
    <ToastProvider>
    <div className="flex flex-1 flex-col">
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>
      <InstallPrompt />
      <BottomNav />
      {modal}
    </div>
    </ToastProvider>
  );
}
