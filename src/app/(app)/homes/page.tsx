import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export default async function HomesPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data: memberships } = await supabase
    .from("home_members")
    .select("home_id, joined_at")
    .eq("user_id", user!.id)
    .order("joined_at", { ascending: true });

  // sem casa → onboarding de criação
  if (!memberships?.length) redirect("/homes/new");

  // vai direto para a casa (a primeira); o seletor no header troca entre elas
  redirect(`/homes/${memberships[0].home_id}`);
}
