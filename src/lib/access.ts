import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type AccessStatus = "pending" | "approved" | "blocked";

/** Linha de acesso do usuário logado (a RLS só devolve a dele). null = sem linha. */
export async function getAccess(
  supabase: SupabaseClient<Database>,
): Promise<{ status: AccessStatus; isAdmin: boolean } | null> {
  const { data } = await supabase
    .from("user_access")
    .select("status, is_admin")
    .maybeSingle();
  if (!data) return null;
  return { status: data.status as AccessStatus, isAdmin: data.is_admin };
}
