"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { generateOccurrencesForTask } from "@/lib/occurrences";
import { todayISO } from "@/lib/tz";

const taskSchema = z.object({
  taskId: z.string().min(1),
  spaceId: z.string().min(1),
  title: z.string().min(1, "Título obrigatório").max(100),
  recurrenceType: z.enum(["once", "daily", "weekly", "custom"]),
  recurrenceIntervalDays: z.coerce.number().int().positive().optional(),
  assignmentType: z.enum(["fixed", "rotation"]),
  assigneeId: z.string().min(1).optional(),
  points: z.coerce.number().int().min(0).default(0),
  timesPerDay: z.coerce.number().int().min(1).max(6).default(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function updateTask(_prev: unknown, formData: FormData) {
  const recurrenceDays = formData.getAll("recurrenceDays").map(Number);

  const parsed = taskSchema.safeParse({
    taskId: formData.get("taskId"),
    spaceId: formData.get("spaceId"),
    title: formData.get("title"),
    recurrenceType: formData.get("recurrenceType"),
    recurrenceIntervalDays: formData.get("recurrenceIntervalDays") || undefined,
    assignmentType: formData.get("assignmentType"),
    assigneeId: formData.get("assigneeId") || undefined,
    points: formData.get("points") || 0,
    timesPerDay: formData.get("timesPerDay") ?? undefined,
    startDate: formData.get("startDate") || undefined,
    endDate: formData.get("endDate") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const once = parsed.data.recurrenceType === "once";
  if (!once && parsed.data.endDate && parsed.data.endDate < parsed.data.startDate) {
    return { error: "A data de término não pode ser antes do início." };
  }

  // rodízio vazio deixaria a tarefa sem ninguém: exige ao menos uma pessoa
  if (parsed.data.assignmentType === "rotation" && !formData.getAll("rotationUserIds").some(Boolean)) {
    return { error: "Escolha ao menos uma pessoa para o rodízio." };
  }

  const supabase = await createClient();

  // O .select() devolve a linha só se o RLS permitiu (membro da casa).
  // Sem isso, um update bloqueado pelo RLS retorna 0 linhas SEM erro e o
  // código seguiria usando o service client num taskId de outra casa.
  const { data: updated, error } = await supabase
    .from("tasks")
    .update({
      title: parsed.data.title,
      recurrence_type: parsed.data.recurrenceType,
      recurrence_days: once ? [] : recurrenceDays,
      recurrence_interval_days: once ? null : parsed.data.recurrenceIntervalDays ?? null,
      assignment_type: parsed.data.assignmentType,
      assignee_id: parsed.data.assignmentType === "fixed" ? parsed.data.assigneeId ?? null : null,
      points: parsed.data.points,
      times_per_day: once ? 1 : parsed.data.timesPerDay,
      start_date: parsed.data.startDate,
      end_date: once ? parsed.data.startDate : parsed.data.endDate ?? null,
    })
    .eq("id", parsed.data.taskId)
    .select("id")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!updated) return { error: "Tarefa não encontrada ou sem permissão." };

  // recria a fila de rodízio
  await supabase.from("task_rotation_queue").delete().eq("task_id", parsed.data.taskId);
  if (parsed.data.assignmentType === "rotation") {
    const rotationUserIds = formData.getAll("rotationUserIds").map(String).filter(Boolean);
    if (rotationUserIds.length) {
      await supabase.from("task_rotation_queue").insert(
        rotationUserIds.map((userId, position) => ({
          task_id: parsed.data.taskId,
          user_id: userId,
          position,
        })),
      );
    }
  }

  // regenera ocorrências futuras: apaga as pendentes a partir de hoje e recria
  const today = todayISO();
  const service = createServiceClient();
  await service
    .from("task_occurrences")
    .delete()
    .eq("task_id", parsed.data.taskId)
    .eq("status", "pending")
    .gte("due_date", today);
  await generateOccurrencesForTask(parsed.data.taskId);

  revalidatePath(`/spaces/${parsed.data.spaceId}`);
  redirect(`/spaces/${parsed.data.spaceId}`);
}

export async function deleteTask(taskId: string, spaceId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) return { error: error.message };
  revalidatePath(`/spaces/${spaceId}`);
  redirect(`/spaces/${spaceId}`);
}
