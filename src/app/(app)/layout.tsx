import { redirect } from "next/navigation";
import { getAccess } from "@/lib/access";
import { BottomNav } from "@/components/bottom-nav";
import { ToastProvider } from "@/components/toast";
import { InstallPrompt } from "@/components/install-prompt";
import { getCurrentUser } from "@/lib/auth";

export default async function AppLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  // acesso só após aprovação do admin (o banco também bloqueia; isto é a UX)
  const access = await getAccess();
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
