"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const spaceSchema = z.object({
  homeId: z.string().min(1),
  name: z.string().min(1, "Nome obrigatório").max(60),
  icon: z.string().optional(),
  mode: z.enum(["simple", "gamified"]).default("simple"),
});

export async function createSpace(_prev: unknown, formData: FormData) {
  const parsed = spaceSchema.safeParse({
    homeId: formData.get("homeId"),
    name: formData.get("name"),
    icon: formData.get("icon"),
    mode: formData.get("mode"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("spaces")
    .insert({
      home_id: parsed.data.homeId,
      name: parsed.data.name,
      icon: parsed.data.icon ?? null,
      mode: parsed.data.mode,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // adiciona o criador como membro do ambiente
  if (user) {
    await supabase.from("space_members").insert({ space_id: data.id, user_id: user.id });
  }

  redirect(`/spaces/${data.id}`);
}
