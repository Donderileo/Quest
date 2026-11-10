"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { todayISO } from "@/lib/tz";

const MAX = 2000;

const skipSchema = z.object({ scope: z.enum(["mine", "all"]) });
const restoreSchema = z.object({ ids: z.array(z.string().min(1)).max(MAX) });

export type SkipResult = { error: string } | { ok: true; count: number; ids: string[] };

function refresh() {
  revalidatePath("/tasks");
  revalidatePath("/homes", "layout");
  revalidatePath("/spaces/[id]", "page");
}

/**
 * "Ignorar tudo" nas atrasadas: marca como `skipped` as pendentes de dias anteriores (inclui as mais
 * antigas que a lista não mostra). `scope` segue o filtro da tela: "mine" = minhas + sem responsável,
 * "all" = da casa. Ignoradas não contam pontos e saem da lista; dá para desfazer.
 * Roda com o cliente do usuário: a RLS garante que só mexe nas casas dele.
 */
export async function skipOverdue(input: z.infer<typeof skipSchema>): Promise<SkipResult> {
  const parsed = skipSchema.safeParse(input);
  const user = await getCurrentUser();
  if (!parsed.success || !user) return { error: "Não foi possível ignorar as atrasadas." };

  const supabase = await createClient();
  let query = supabase
    .from("task_occurrences")
    .select("id")
    .eq("status", "pending")
    .lt("due_date", todayISO())
    .limit(MAX);
  if (parsed.data.scope === "mine") query = query.or(`assigned_to.eq.${user.id},assigned_to.is.null`);

  const { data: found, error } = await query;
  if (error) {
    console.error("[skipOverdue] leitura:", error.message);
    return { error: "Não foi possível ignorar as atrasadas agora." };
  }
  const ids = (found ?? []).map((o) => o.id);
  if (ids.length === 0) return { ok: true, count: 0, ids: [] };

  // o .eq("status") evita pisar numa tarefa concluída entre a leitura e a escrita
  const { data: done, error: upError } = await supabase
    .from("task_occurrences")
    .update({ status: "skipped" })
    .in("id", ids)
    .eq("status", "pending")
    .select("id");
  if (upError) {
    console.error("[skipOverdue] escrita:", upError.message);
    return { error: "Não foi possível ignorar as atrasadas agora." };
  }

  refresh();
  const changed = (done ?? []).map((o) => o.id);
  return { ok: true, count: changed.length, ids: changed };
}

/** Desfazer: volta a pendente só o que ainda está ignorado. */
export async function restoreSkipped(input: z.infer<typeof restoreSchema>): Promise<SkipResult> {
  const parsed = restoreSchema.safeParse(input);
  if (!parsed.success) return { error: "Nada para desfazer." };
  if (parsed.data.ids.length === 0) return { ok: true, count: 0, ids: [] };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_occurrences")
    .update({ status: "pending" })
    .in("id", parsed.data.ids)
    .eq("status", "skipped")
    .select("id");
  if (error) {
    console.error("[restoreSkipped]", error.message);
    return { error: "Não foi possível desfazer." };
  }
  refresh();
  return { ok: true, count: (data ?? []).length, ids: [] };
}
