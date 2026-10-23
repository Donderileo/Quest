import { createServiceClient } from "@/lib/supabase/server";
import { dueDatesInRange } from "@/lib/recurrence";
import { assigneeForIndex, orderedQueue, rankRotationTasks, rotationStartOffset } from "@/lib/rotation";
import { addDaysISO, todayISO } from "@/lib/tz";

type TaskRow = {
  id: string;
  recurrence_type: "daily" | "weekly" | "custom";
  recurrence_days: number[] | null;
  recurrence_interval_days: number | null;
  assignment_type: "fixed" | "rotation";
  assignee_id: string | null;
  start_date: string;
  end_date: string | null;
  created_at: string;
  spaces: { home_id: string };
};

const TASK_COLS =
  "id, recurrence_type, recurrence_days, recurrence_interval_days, assignment_type, assignee_id, start_date, end_date, created_at, spaces!inner(home_id)";

const CHUNK = 10;

/**
 * Gera ocorrências dos próximos `days` dias (a partir de HOJE no fuso do app).
 * Sem `taskIds`, processa todas as tarefas ativas (cron). Usa service client
 * (INSERT em task_occurrences é restrito por RLS). Idempotente: upsert em
 * (task_id, due_date) ignorando duplicadas.
 *
 * Rodízio: a n-ésima ocorrência da tarefa vai para fila[(n + deslocamento) % tamanho], onde n é
 * a posição cronológica — (ocorrências antes da janela) + índice na janela — e o deslocamento é a
 * posição da tarefa entre os rodízios da casa (escalona o início: tarefas iguais não caem todas
 * na mesma pessoa no mesmo dia). Determinístico: rodar duas vezes nunca desloca a fila.
 */
export async function generateOccurrences(
  taskIds?: string[],
  days = 7,
): Promise<{ created: number; from: string; to: string }> {
  const supabase = createServiceClient();
  const from = todayISO();
  const to = addDaysISO(from, days);

  let query = supabase.from("tasks").select(TASK_COLS).is("archived_at", null);
  if (taskIds) query = query.in("id", taskIds);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const tasks = (data ?? []) as unknown as TaskRow[];

  // filas de rodízio de todas as tarefas num só round-trip
  const rotationIds = tasks.filter((t) => t.assignment_type === "rotation").map((t) => t.id);
  const queues = new Map<string, { userId: string; position: number }[]>();
  if (rotationIds.length) {
    const { data: entries } = await supabase
      .from("task_rotation_queue")
      .select("task_id, user_id, position")
      .in("task_id", rotationIds);
    for (const e of entries ?? []) {
      if (!queues.has(e.task_id)) queues.set(e.task_id, []);
      queues.get(e.task_id)!.push({ userId: e.user_id, position: e.position });
    }
  }

  // posição de cada rodízio entre TODOS os da casa (mesmo ao gerar só uma tarefa), para escalonar o início
  const ranks = new Map<string, number>();
  const homeIds = [...new Set(tasks.filter((t) => t.assignment_type === "rotation").map((t) => t.spaces.home_id))];
  if (homeIds.length) {
    const { data: all } = await supabase
      .from("tasks")
      .select("id, created_at, spaces!inner(home_id)")
      .eq("assignment_type", "rotation")
      .is("archived_at", null)
      .in("spaces.home_id", homeIds);
    const byHome = new Map<string, { id: string; createdAt: string }[]>();
    for (const t of (all ?? []) as unknown as { id: string; created_at: string; spaces: { home_id: string } }[]) {
      const list = byHome.get(t.spaces.home_id) ?? [];
      list.push({ id: t.id, createdAt: t.created_at });
      byHome.set(t.spaces.home_id, list);
    }
    for (const list of byHome.values()) for (const [id, rank] of rankRotationTasks(list)) ranks.set(id, rank);
  }

  let created = 0;

  async function processTask(task: TaskRow) {
    const dues = dueDatesInRange(
      {
        type: task.recurrence_type,
        startDate: task.start_date,
        endDate: task.end_date,
        days: task.recurrence_days ?? [],
        intervalDays: task.recurrence_interval_days ?? undefined,
      },
      from,
      to,
    );
    if (!dues.length) return;

    let queue: string[] = [];
    let before = 0;
    if (task.assignment_type === "rotation") {
      queue = orderedQueue(queues.get(task.id) ?? []);
      const { count } = await supabase
        .from("task_occurrences")
        .select("id", { count: "exact", head: true })
        .eq("task_id", task.id)
        .lt("due_date", from);
      before = count ?? 0;
    }

    const rows = dues.map((due, i) => ({
      task_id: task.id,
      due_date: due,
      assigned_to: task.assignment_type === "fixed" ? task.assignee_id : assigneeForIndex(queue, before + i + rotationStartOffset(ranks.get(task.id) ?? 0)),
      status: "pending" as const,
    }));

    const { error: upsertError } = await supabase
      .from("task_occurrences")
      .upsert(rows, { onConflict: "task_id,due_date", ignoreDuplicates: true });
    if (upsertError) throw new Error(upsertError.message);
    created += rows.length;
  }

  for (let i = 0; i < tasks.length; i += CHUNK) {
    await Promise.all(tasks.slice(i, i + CHUNK).map(processTask));
  }

  return { created, from, to };
}

/** Atalho usado pelas server actions ao criar/editar uma tarefa. */
export async function generateOccurrencesForTask(taskId: string, days = 7): Promise<number> {
  const { created } = await generateOccurrences([taskId], days);
  return created;
}
