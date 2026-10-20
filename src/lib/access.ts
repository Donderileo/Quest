import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type AccessStatus = "pending" | "approved" | "blocked";

/** Linha de acesso do usuário logado (a RLS só devolve a dele). Uma consulta por requisição. */
export const getAccess = cache(
  async (): Promise<{ status: AccessStatus; isAdmin: boolean } | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase.from("user_access").select("status, is_admin").maybeSingle();
    // erro transitório NÃO é "sem acesso": falha em vez de mandar uma pessoa aprovada para /pending
    if (error) {
      console.error("[access] falha ao consultar user_access:", error.code, error.message);
      throw new Error("Não foi possível verificar o acesso agora.");
    }
    if (!data) return null;
    return { status: data.status as AccessStatus, isAdmin: data.is_admin };
  },
);
