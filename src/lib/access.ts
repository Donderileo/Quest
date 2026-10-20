import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type AccessStatus = "pending" | "approved" | "blocked";

/** Linha de acesso do usuário logado (a RLS só devolve a dele). Uma consulta por requisição. */
export const getAccess = cache(
  async (): Promise<{ status: AccessStatus; isAdmin: boolean } | null> => {
    const supabase = await createClient();
    const { data } = await supabase.from("user_access").select("status, is_admin").maybeSingle();
    if (!data) return null;
    return { status: data.status as AccessStatus, isAdmin: data.is_admin };
  },
);
