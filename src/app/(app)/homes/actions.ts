"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { generateOccurrences } from "@/lib/occurrences";
import { todayISO } from "@/lib/tz";

const homeSchema = z.object({
  name: z.string().min(2, "Nome precisa ter ao menos 2 caracteres").max(60),
});

export async function createHome(_prev: unknown, formData: FormData) {
  const parsed = homeSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.data };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_home", {
    home_name: parsed.data.name,
  });

  if (error) return { error: error.message };
  redirect(`/homes/${data.id}`);
}

export async function joinHome(_prev: unknown, formData: FormData) {
  const code = (formData.get("code") as string)?.trim().toUpperCase();
  if (!code || code.length !== 8) return { error: "Código inválido" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_home", { code });

  if (error) return { error: "Código não encontrado" };
  revalidatePath("/homes");
  redirect(`/homes/${data.id}`);
}

const renameSchema = z.object({
  homeId: z.string().min(1),
  name: z.string().trim().min(2, "Nome precisa ter ao menos 2 caracteres").max(60),
});

export async function renameHome(_prev: unknown, formData: FormData) {
  const parsed = renameSchema.safeParse({ homeId: formData.get("homeId"), name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("homes")
    .update({ name: parsed.data.name })
    .eq("id", parsed.data.homeId)
    .select("id");
  if (error) return { error: error.message };
  // RLS bloqueada não dá erro: 0 linhas = sem permissão
  if (!data?.length) return { error: "Só o dono ou admin da casa pode renomear." };

  revalidatePath("/homes", "layout");
  return { ok: "Nome atualizado." };
}

export async function regenerateInviteCode(homeId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("regenerate_invite_code", { h: homeId });
  if (error) return { error: "Só o dono ou admin da casa pode gerar um novo código." };
  revalidatePath(`/homes/${homeId}`, "layout");
  return { code: data as string };
}

export async function leaveHome(homeId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_home", { h: homeId });
  if (error) {
    return {
      error: /owner_cannot_leave/.test(error.message)
        ? "O dono não pode sair. Exclua a casa, ou peça para outra pessoa assumir."
        : "Não foi possível sair da casa.",
    };
  }
  revalidatePath("/homes", "layout");
  redirect("/homes");
}

export async function deleteHome(homeId: string, confirmName: string) {
  const supabase = await createClient();
  const { data: home } = await supabase.from("homes").select("name").eq("id", homeId).maybeSingle();
  if (!home) return { error: "Casa não encontrada." };
  if (home.name.trim() !== confirmName.trim()) return { error: "O nome digitado não confere." };

  const { data, error } = await supabase.from("homes").delete().eq("id", homeId).select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Só o dono pode excluir a casa." };

  revalidatePath("/homes", "layout");
  redirect("/homes");
}

const redistributeSchema = z.object({
  homeId: z.string().min(1),
  from: z.string().min(1), // id da pessoa, ou "none" = tarefas sem responsável
  to: z.string().min(1),
  mode: z.enum(["move", "split"]),
  spaceIds: z.array(z.string().min(1)),
});

/**
 * Passa as tarefas de uma pessoa para outra (ou divide entre as duas), na casa toda ou em ambientes
 * escolhidos. A regra roda atômica no banco (redistribute_tasks, com checagem de permissão);
 * aqui só regeneramos as ocorrências futuras dos rodízios, cuja atribuição é calculada pelo app.
 */
export type RedistributeResult =
  | { error: string }
  | { ok: true; fixed: number; rotations: number; spacesJoined: number };

export async function redistributeTasks(input: z.infer<typeof redistributeSchema>): Promise<RedistributeResult> {
  const parsed = redistributeSchema.safeParse(input);
  if (!parsed.success) return { error: "Escolha quem passa para quem." };
  const { homeId, from, to, mode, spaceIds } = parsed.data;

  const supabase = await createClient();
  const today = todayISO();
  const { data, error } = await supabase.rpc("redistribute_tasks", {
    p_home: homeId,
    // o gerador de tipos não marca estes parâmetros como anuláveis, mas a função aceita null
    // (null = tarefas sem responsável / casa toda)
    p_from: (from === "none" ? null : from) as string,
    p_to: to,
    p_mode: mode,
    p_space_ids: (spaceIds.length ? spaceIds : null) as string[],
    p_today: today,
  });
  if (error) {
    console.error("[redistribute]", error.code, error.message);
    return {
      error: /same_user/.test(error.message)
        ? "Escolha duas pessoas diferentes."
        : "Não foi possível redistribuir as tarefas agora.",
    };
  }

  const result = data as {
    tasks_moved: number;
    occurrences_moved: number;
    rotation_task_ids: string[];
    spaces_joined: number;
  };

  // rodízio: recalcula quem faz cada ocorrência futura com a fila nova
  if (result.rotation_task_ids.length) {
    const service = createServiceClient();
    await service
      .from("task_occurrences")
      .delete()
      .in("task_id", result.rotation_task_ids)
      .eq("status", "pending")
      .gte("due_date", today);
    await generateOccurrences(result.rotation_task_ids);
  }

  revalidatePath("/tasks");
  revalidatePath("/homes", "layout");
  revalidatePath("/spaces/[id]", "page");
  return {
    ok: true,
    fixed: result.tasks_moved,
    rotations: result.rotation_task_ids.length,
    spacesJoined: result.spaces_joined,
  };
}
