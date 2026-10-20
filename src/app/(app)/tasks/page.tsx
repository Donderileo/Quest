import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { TasksBoard, type BoardOccurrence } from "@/components/tasks-board";
import { addDaysISO, todayISO } from "@/lib/tz";
import { getCurrentUser } from "@/lib/auth";

const DAYS = 7;

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

  const [{ count: homes }, { data }] = await Promise.all([
    supabase.from("home_members").select("home_id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase
      .from("task_occurrences")
      .select(
        "id, task_id, due_date, status, assigned_to, assignee:profiles!task_occurrences_assigned_to_fkey(name, avatar_url), tasks!inner(title, points, spaces!inner(id, name, icon, mode))",
      )
      .gte("due_date", today)
      .lte("due_date", days[DAYS - 1])
      .order("due_date", { ascending: true }),
  ]);

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
