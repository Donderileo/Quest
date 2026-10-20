"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
