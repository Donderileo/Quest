import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { TasksBoard, type BoardOccurrence } from "@/components/tasks-board";
import { addDaysISO, todayISO } from "@/lib/tz";
import { getCurrentUser } from "@/lib/auth";

const DAYS = 7;
const OVERDUE_LOOKBACK_DAYS = 30; // atrasadas: pendências dos últimos 30 dias

type Row = {
  id: string;
  task_id: string;
  due_date: string;
  status: string;
  assigned_to: string | null;
  assignee: { name: string; avatar_url: string | null } | null;
  tasks: {
    title: string;
    points: number;
    spaces: { id: string; name: string; icon: string | null; mode: string };
  };
};

export default async function TasksPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const today = todayISO();
  const days = Array.from({ length: DAYS }, (_, i) => addDaysISO(today, i));

  const [{ count: homes, error: homesError }, { data, error }] = await Promise.all([
    supabase.from("home_members").select("home_id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase
      .from("task_occurrences")
      .select(
        "id, task_id, due_date, status, assigned_to, assignee:profiles!task_occurrences_assigned_to_fkey(name, avatar_url), tasks!inner(title, points, spaces!inner(id, name, icon, mode))",
      )
      // próximos 7 dias (qualquer status) + pendentes que ficaram para trás (atrasadas)
      .gte("due_date", addDaysISO(today, -OVERDUE_LOOKBACK_DAYS))
      .lte("due_date", days[DAYS - 1])
      .or(`due_date.gte.${today},status.eq.pending`)
      .order("due_date", { ascending: true })
      .limit(500),
  ]);

  // erro transitório NÃO é "sem casa": falha (tela "tentar de novo") em vez de mandar para o onboarding
  if (homesError || error) {
    console.error("[tasks] falha ao carregar:", homesError?.message ?? error?.message);
    throw new Error("Não foi possível carregar as tarefas agora.");
  }

  // sem casa ainda → onboarding (criar ou entrar)
  if (!homes) redirect("/homes");

  const occurrences: BoardOccurrence[] = ((data ?? []) as unknown as Row[]).map((o) => ({
    id: o.id,
    taskId: o.task_id,
    date: o.due_date,
    done: o.status === "done",
    assignedTo: o.assigned_to,
    assignee: o.assignee,
    title: o.tasks.title,
    points: o.tasks.points,
    gamified: o.tasks.spaces.mode === "gamified",
    spaceId: o.tasks.spaces.id,
    spaceName: o.tasks.spaces.name,
    spaceIcon: o.tasks.spaces.icon,
  }));

  return (
    <>
      <RealtimeRefresh tables={["task_occurrences"]} />
      <TasksBoard occurrences={occurrences} meId={user.id} today={today} days={days} />
    </>
  );
}
