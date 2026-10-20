import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { ManageHome } from "./manage-home";

export default async function ManageHomePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser();

  const [{ data: home }, { data: me }] = await Promise.all([
    supabase.from("homes").select("id, name, invite_code").eq("id", id).maybeSingle(),
    supabase.from("home_members").select("role").eq("home_id", id).eq("user_id", user?.id ?? "").maybeSingle(),
  ]);
  if (!home || !me) notFound();

  return <ManageHome home={home} role={me.role} />;
}
