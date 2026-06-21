import { NextResponse } from "next/server";
import { addDays, format } from "date-fns";
import { createServiceClient } from "@/lib/supabase/server";
import { dueDatesInRange } from "@/lib/recurrence";
import { assigneeForIndex, orderedQueue } from "@/lib/rotation";

const ISO = "yyyy-MM-dd";

/** Protegido por CRON_SECRET no header Authorization: Bearer <secret> */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const today = new Date();
  const from = format(today, ISO);
  const to = format(addDays(today, 7), ISO);

  // Busca todas as tasks ativas
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, recurrence_type, recurrence_days, recurrence_interval_days, assignment_type, assignee_id, start_date")
    .is("archived_at", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let created = 0;

  for (const task of tasks ?? []) {
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

    if (!dues.length) continue;

    // Para rodízio, precisa da fila e do count de ocorrências já geradas
    let queue: string[] = [];
    let occurrenceOffset = 0;

    if (task.assignment_type === "rotation") {
      const [{ data: queueEntries }, { count }] = await Promise.all([
        supabase
          .from("task_rotation_queue")
          .select("user_id, position")
          .eq("task_id", task.id),
        supabase
          .from("task_occurrences")
          .select("id", { count: "exact", head: true })
          .eq("task_id", task.id),
      ]);
      queue = orderedQueue(
        (queueEntries ?? []).map((e: { user_id: string; position: number }) => ({
          userId: e.user_id,
          position: e.position,
        })),
      );
      occurrenceOffset = count ?? 0;
    }

    for (let i = 0; i < dues.length; i++) {
      const dueDate = dues[i];
      const assignedTo =
        task.assignment_type === "fixed"
          ? task.assignee_id
          : assigneeForIndex(queue, occurrenceOffset + i);

      await supabase
        .from("task_occurrences")
        .upsert(
          { task_id: task.id, due_date: dueDate, assigned_to: assignedTo, status: "pending" },
          { onConflict: "task_id,due_date", ignoreDuplicates: true },
        );

      created++;
    }
  }

  return NextResponse.json({ ok: true, created, from, to });
}
