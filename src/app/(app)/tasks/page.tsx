import { redirect } from "next/navigation";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { TaskCard } from "@/components/task-card";

export default async function TasksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const today = format(new Date(), "yyyy-MM-dd");

  const { data: occurrences } = await supabase
    .from("task_occurrences")
    .select("id, due_date, status, assigned_to, tasks(title, points, spaces(mode))")
    .eq("assigned_to", user.id)
    .eq("status", "pending")
    .gte("due_date", today)
    .order("due_date", { ascending: true })
    .limit(50);

  return (
    <div className="px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold">Minhas tarefas</h1>

      {!occurrences?.length ? (
        <p className="text-sm text-muted-foreground text-center py-12">
          Nenhuma tarefa pendente para você. 🎉
        </p>
      ) : (
        <ul className="space-y-2">
          {occurrences.map((occ) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const task = occ.tasks as any;
            const gamified = task?.spaces?.mode === "gamified";
            return (
              <TaskCard key={occ.id} occurrence={{ ...occ, profiles: null }} gamified={gamified} />
            );
          })}
        </ul>
      )}
    </div>
  );
}
