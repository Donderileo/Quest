"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const taskSchema = z.object({
  spaceId: z.string().uuid(),
  title: z.string().min(1, "Título obrigatório").max(100),
  description: z.string().optional(),
  recurrenceType: z.enum(["daily", "weekly", "custom"]),
  recurrenceDays: z.string().optional(), // JSON array "0,4" (dias da semana)
  recurrenceIntervalDays: z.coerce.number().int().positive().optional(),
  assignmentType: z.enum(["fixed", "rotation"]),
  assigneeId: z.string().uuid().optional(),
  points: z.coerce.number().int().min(0).default(0),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(() => new Date().toISOString().slice(0, 10)),
});

export async function createTask(_prev: unknown, formData: FormData) {
  const recurrenceDaysRaw = formData.getAll("recurrenceDays").map(Number);

  const parsed = taskSchema.safeParse({
    spaceId: formData.get("spaceId"),
    title: formData.get("title"),
    description: formData.get("description"),
    recurrenceType: formData.get("recurrenceType"),
    recurrenceDays: recurrenceDaysRaw,
    recurrenceIntervalDays: formData.get("recurrenceIntervalDays") || undefined,
    assignmentType: formData.get("assignmentType"),
    assigneeId: formData.get("assigneeId") || undefined,
    points: formData.get("points") || 0,
    startDate: formData.get("startDate"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
      assignee_id: parsed.data.assigneeId ?? null,
      points: parsed.data.points,
      start_date: parsed.data.startDate,
      created_by: user!.id,
    })
    .select("id, space_id")
    .single();

  if (error) return { error: error.message };
  redirect(`/spaces/${data.space_id}`);
}
