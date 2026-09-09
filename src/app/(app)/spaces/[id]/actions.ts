"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export async function completeOccurrence(occurrenceId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("task_occurrences")
    .update({ status: "done", completed_at: new Date().toISOString(), completed_by: user.id })
    .eq("id", occurrenceId);

  revalidatePath("/spaces/[id]", "page");
}

const updateSpaceSchema = z.object({
  spaceId: z.string().min(1),
  name: z.string().min(1, "Nome obrigatório").max(60),
  icon: z.string().optional(),
  mode: z.enum(["simple", "gamified"]).default("simple"),
});

export async function updateSpace(_prev: unknown, formData: FormData) {
  const parsed = updateSpaceSchema.safeParse({
    spaceId: formData.get("spaceId"),
    name: formData.get("name"),
    icon: formData.get("icon"),
    mode: formData.get("mode"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();

  const { error } = await supabase
    .from("spaces")
    .update({
      name: parsed.data.name,
      icon: parsed.data.icon ?? null,
      mode: parsed.data.mode,
    })
    .eq("id", parsed.data.spaceId);
  if (error) return { error: error.message };

  // sincroniza membros do ambiente com a seleção do form
  const selected = formData.getAll("memberIds").map(String).filter(Boolean);
  const { data: current } = await supabase
    .from("space_members")
    .select("user_id")
    .eq("space_id", parsed.data.spaceId);
  const currentIds = new Set(current?.map((m) => m.user_id) ?? []);
  const selectedSet = new Set(selected);

  const toAdd = selected.filter((id) => !currentIds.has(id));
  const toRemove = [...currentIds].filter((id) => !selectedSet.has(id));

  if (toAdd.length) {
    await supabase
      .from("space_members")
      .insert(toAdd.map((userId) => ({ space_id: parsed.data.spaceId, user_id: userId })));
  }
  if (toRemove.length) {
    await supabase
      .from("space_members")
      .delete()
      .eq("space_id", parsed.data.spaceId)
      .in("user_id", toRemove);

    // desvincula quem saiu das tarefas deste ambiente
    const { data: spaceTasks } = await supabase
      .from("tasks")
      .select("id")
      .eq("space_id", parsed.data.spaceId);
    const taskIds = spaceTasks?.map((t) => t.id) ?? [];

    if (taskIds.length) {
      // responsável fixo vira órfão (sem responsável)
      await supabase
        .from("tasks")
        .update({ assignee_id: null })
        .in("id", taskIds)
        .in("assignee_id", toRemove);

      // remove da fila de rodízio
      await supabase
        .from("task_rotation_queue")
        .delete()
        .in("task_id", taskIds)
        .in("user_id", toRemove);

      // libera ocorrências futuras pendentes atribuídas a essa pessoa
      await supabase
        .from("task_occurrences")
        .update({ assigned_to: null })
        .in("task_id", taskIds)
        .in("assigned_to", toRemove)
        .eq("status", "pending");
    }
  }

  revalidatePath(`/spaces/${parsed.data.spaceId}`);
  redirect(`/spaces/${parsed.data.spaceId}`);
}

export async function deleteSpace(spaceId: string, homeId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("spaces").delete().eq("id", spaceId);
  if (error) return { error: error.message };
  redirect(`/homes/${homeId}`);
}
