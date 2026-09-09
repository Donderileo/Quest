import { addDays, format } from "date-fns";
import { createServiceClient } from "@/lib/supabase/server";
import { dueDatesInRange } from "@/lib/recurrence";
import { assigneeForIndex, orderedQueue } from "@/lib/rotation";

const ISO = "yyyy-MM-dd";

/**
 * Gera as ocorrências de UMA tarefa para os próximos `days` dias.
 * Usa o service client (bypassa RLS — INSERT em task_occurrences é restrito).
 * Idempotente: upsert com onConflict (task_id, due_date).
 */
export async function generateOccurrencesForTask(taskId: string, days = 7): Promise<number> {
  const supabase = createServiceClient();

  const { data: task } = await supabase
    .from("tasks")
    .select("id, recurrence_type, recurrence_days, recurrence_interval_days, assignment_type, assignee_id, start_date, archived_at")
    .eq("id", taskId)
    .single();

  if (!task || task.archived_at) return 0;

  const today = new Date();
  const from = format(today, ISO);
  const to = format(addDays(today, days), ISO);

  const dues = dueDatesInRange(
    {
      type: task.recurrence_type,
      startDate: task.start_date,
      days: task.recurrence_days ?? [],
      intervalDays: task.recurrence_interval_days ?? undefined,
    },
    from,
    to,
  );
  if (!dues.length) return 0;

  let queue: string[] = [];
  let occurrenceOffset = 0;

  if (task.assignment_type === "rotation") {
    const [{ data: queueEntries }, { count }] = await Promise.all([
      supabase.from("task_rotation_queue").select("user_id, position").eq("task_id", task.id),
      supabase.from("task_occurrences").select("id", { count: "exact", head: true }).eq("task_id", task.id),
    ]);
    queue = orderedQueue(
      (queueEntries ?? []).map((e: { user_id: string; position: number }) => ({
        userId: e.user_id,
        position: e.position,
      })),
    );
    occurrenceOffset = count ?? 0;
  }

  let created = 0;
  for (let i = 0; i < dues.length; i++) {
    const assignedTo =
      task.assignment_type === "fixed"
        ? task.assignee_id
        : assigneeForIndex(queue, occurrenceOffset + i);

    await supabase
      .from("task_occurrences")
      .upsert(
        { task_id: task.id, due_date: dues[i], assigned_to: assignedTo, status: "pending" },
        { onConflict: "task_id,due_date", ignoreDuplicates: true },
      );
    created++;
  }
  return created;
}
