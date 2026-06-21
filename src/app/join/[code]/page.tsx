import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createClient();

  const { data: home, error } = await supabase.rpc("join_home", { code: code.toUpperCase() });

  if (error || !home) {
    redirect(`/homes?error=invalid_invite`);
  }

  redirect(`/homes/${home.id}`);
}
