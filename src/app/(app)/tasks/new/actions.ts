"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateOccurrencesForTask } from "@/lib/occurrences";
import { todayISO } from "@/lib/tz";
import { getCurrentUser } from "@/lib/auth";

const taskSchema = z.object({
  spaceId: z.string().min(1),
  title: z.string().min(1, "Título obrigatório").max(100),
  description: z.string().optional(),
  recurrenceType: z.enum(["daily", "weekly", "custom"]),
  recurrenceDays: z.array(z.number()).optional(),
  recurrenceIntervalDays: z.coerce.number().int().positive().optional(),
  assignmentType: z.enum(["fixed", "rotation"]),
  assigneeId: z.string().min(1).optional(),
  points: z.coerce.number().int().min(0).default(0),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(() => todayISO()),
});

export async function createTask(_prev: unknown, formData: FormData) {
  const recurrenceDaysRaw = formData.getAll("recurrenceDays").map(Number);

  const parsed = taskSchema.safeParse({
    spaceId: formData.get("spaceId"),
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
    recurrenceType: formData.get("recurrenceType"),
    recurrenceDays: recurrenceDaysRaw,
    recurrenceIntervalDays: formData.get("recurrenceIntervalDays") || undefined,
    assignmentType: formData.get("assignmentType"),
    assigneeId: formData.get("assigneeId") || undefined,
    points: formData.get("points") || 0,
    startDate: formData.get("startDate") ?? undefined,
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      space_id: parsed.data.spaceId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      recurrence_type: parsed.data.recurrenceType,
      recurrence_days: recurrenceDaysRaw,
      recurrence_interval_days: parsed.data.recurrenceIntervalDays ?? null,
      assignment_type: parsed.data.assignmentType,
      assignee_id: parsed.data.assignmentType === "fixed" ? parsed.data.assigneeId ?? null : null,
      points: parsed.data.points,
      start_date: parsed.data.startDate,
      created_by: user!.id,
    })
    .select("id, space_id")
    .single();

  if (error) return { error: error.message };

  // rodízio: grava a fila ordenada
  if (parsed.data.assignmentType === "rotation") {
    const rotationUserIds = formData.getAll("rotationUserIds").map(String).filter(Boolean);
    if (rotationUserIds.length) {
      await supabase.from("task_rotation_queue").insert(
        rotationUserIds.map((userId, position) => ({
          task_id: data.id,
          user_id: userId,
          position,
        })),
      );
    }
  }

  // gera as ocorrências já na criação (não espera o cron diário)
  await generateOccurrencesForTask(data.id);

  revalidatePath(`/spaces/${data.space_id}`);
  redirect(`/spaces/${data.space_id}`);
}
