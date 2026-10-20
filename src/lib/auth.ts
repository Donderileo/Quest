import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Usuário logado a partir das claims do JWT (getClaims): com chaves de assinatura assimétricas
 * a verificação é local, sem ida ao servidor de Auth (antes: getUser em proxy + layout + página).
 * `cache` faz uma única leitura por requisição. A autorização real continua no banco (RLS).
 */
export const getCurrentUser = cache(async (): Promise<{ id: string; email: string | null } | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
});
