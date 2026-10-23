import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { addDaysISO } from "@/lib/tz";
import { orderedQueue } from "@/lib/rotation";
import type { BalanceData, BalanceRow } from "@/lib/balance-data";

export const BALANCE_WINDOW_DAYS = 7;

type OccRow = {
  id: string;
  task_id: string;
  due_date: string;
  status: string;
  assigned_to: string | null;
  tasks: {
    assignment_type: "fixed" | "rotation";
    points: number;
    space_id: string;
    spaces: { id: string; mode: string; home_id: string };
  };
};

/**
 * Lê (sob RLS, com o cliente do usuário) as ocorrências de hoje até +6 dias da casa, mais pessoas,
 * ambientes e as filas de rodízio. Usado pela página e pela action: os dois calculam sobre os mesmos dados.
 */
export async function loadBalanceData(
  supabase: SupabaseClient<Database>,
  homeId: string,
  today: string,
): Promise<BalanceData> {
  const end = addDaysISO(today, BALANCE_WINDOW_DAYS - 1);

  const [{ data: occ, error }, { data: members }, { data: spaces }, { data: spaceMembers }] = await Promise.all([
    supabase
      .from("task_occurrences")
      .select(
        "id, task_id, due_date, status, assigned_to, tasks!inner(assignment_type, points, space_id, archived_at, spaces!inner(id, mode, home_id))",
      )
      .eq("tasks.spaces.home_id", homeId)
      .is("tasks.archived_at", null)
      .in("status", ["pending", "done"])
      .gte("due_date", today)
      .lte("due_date", end),
    supabase.from("home_members").select("profiles(id, name, avatar_url)").eq("home_id", homeId),
    supabase.from("spaces").select("id, name, icon, mode").eq("home_id", homeId).order("created_at"),
    supabase.from("space_members").select("space_id, user_id, spaces!inner(home_id)").eq("spaces.home_id", homeId),
  ]);
  if (error) throw new Error(error.message);

  const occRows = (occ ?? []) as unknown as OccRow[];
  const rotationIds = [...new Set(occRows.filter((o) => o.tasks.assignment_type === "rotation").map((o) => o.task_id))];
  const queues = new Map<string, { userId: string; position: number }[]>();
  if (rotationIds.length) {
    const { data: entries } = await supabase
      .from("task_rotation_queue")
      .select("task_id, user_id, position")
      .in("task_id", rotationIds);
    for (const e of entries ?? []) {
      const list = queues.get(e.task_id) ?? [];
      list.push({ userId: e.user_id, position: e.position });
      queues.set(e.task_id, list);
    }
  }

  const rows: BalanceRow[] = occRows.map((o) => ({
    id: o.id,
    taskId: o.task_id,
    date: o.due_date,
    status: o.status === "done" ? "done" : "pending",
    assignee: o.assigned_to,
    type: o.tasks.assignment_type,
    points: o.tasks.points,
    gamified: o.tasks.spaces.mode === "gamified",
    spaceId: o.tasks.space_id,
    candidates: o.tasks.assignment_type === "rotation" ? orderedQueue(queues.get(o.task_id) ?? []) : [],
  }));

  const people = (members ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((m) => (m.profiles as any) as { id: string; name: string; avatar_url: string | null } | null)
    .filter((p): p is { id: string; name: string; avatar_url: string | null } => !!p)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const membersBySpace = new Map<string, string[]>();
  for (const m of spaceMembers ?? []) {
    const list = membersBySpace.get(m.space_id) ?? [];
    list.push(m.user_id);
    membersBySpace.set(m.space_id, list);
  }

  return {
    rows,
    people,
    spaces: (spaces ?? []).map((s) => ({ ...s, memberIds: membersBySpace.get(s.id) ?? [] })),
  };
}
