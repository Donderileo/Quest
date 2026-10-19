"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";

const schema = z.object({
  userId: z.string().min(1),
  status: z.enum(["approved", "blocked", "pending"]),
});

/**
 * Aprovar / bloquear / reabrir. Fonte da verdade do papel de admin é o banco:
 * confirmamos is_admin com o cliente DO USUÁRIO (sob RLS) e só então usamos a service role.
 */
export async function setAccessStatus(formData: FormData) {
  const parsed = schema.safeParse({
    userId: formData.get("userId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const access = user ? await getAccess(supabase) : null;
  if (!user || access?.status !== "approved" || !access.isAdmin) return;

  const { userId, status } = parsed.data;
  if (userId === user.id) return; // ninguém altera o próprio acesso

  const service = createServiceClient();
  const { data: target } = await service
    .from("user_access")
    .select("is_admin")
    .eq("user_id", userId)
    .maybeSingle();
  if (!target || target.is_admin) return; // admins só mudam por SQL

  await service
    .from("user_access")
    .update({ status, decided_at: new Date().toISOString(), decided_by: user.id })
    .eq("user_id", userId);

  revalidatePath("/admin");
}
