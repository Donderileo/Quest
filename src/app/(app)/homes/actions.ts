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
