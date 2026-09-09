import { redirect } from "next/navigation";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import { TaskCard } from "@/components/task-card";
import { RealtimeRefresh } from "@/components/realtime-refresh";

type Occ = {
  id: string;
  due_date: string;
  status: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tasks: any;
};

function bucketOf(dateStr: string): string {
  const d = parseISO(dateStr);
  if (isToday(d)) return "Hoje";
  if (isTomorrow(d)) return "Amanhã";
  return "Em breve";
}

export default async function TasksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const today = format(new Date(), "yyyy-MM-dd");

  const { data: occurrences } = await supabase
    .from("task_occurrences")
    .select("id, due_date, status, assigned_to, tasks!inner(title, points, spaces!inner(name, mode))")
    .or(`assigned_to.eq.${user.id},assigned_to.is.null`)
    .eq("status", "pending")
    .gte("due_date", today)
    .order("due_date", { ascending: true })
    .limit(50);

  // agrupa por bucket de data, preservando a ordem (Hoje, Amanhã, Em breve)
  const order = ["Hoje", "Amanhã", "Em breve"];
  const groups = new Map<string, Occ[]>();
  for (const occ of (occurrences as Occ[]) ?? []) {
    const b = bucketOf(occ.due_date);
    if (!groups.has(b)) groups.set(b, []);
    groups.get(b)!.push(occ);
  }

  return (
    <div className="space-y-6 px-[22px] py-6">
      <RealtimeRefresh tables={["task_occurrences"]} />
      <h1 className="text-2xl font-extrabold tracking-tight">Minhas tarefas</h1>

      {!occurrences?.length ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Nenhuma tarefa pendente para você. 🎉
        </p>
      ) : (
        <div className="space-y-6">
          {order
            .filter((b) => groups.has(b))
            .map((bucket) => {
              const items = groups.get(bucket)!;
              const label =
                bucket === "Em breve"
                  ? bucket
                  : `${bucket} · ${format(parseISO(items[0].due_date), "EEE d", { locale: ptBR })}`;
              return (
                <section key={bucket} className="space-y-[9px]">
                  <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-[#9aa09b]">
                    {label}
                  </h2>
                  {items.map((occ) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const gamified = (occ.tasks as any)?.spaces?.mode === "gamified";
                    return <TaskCard key={occ.id} occurrence={occ} gamified={gamified} />;
                  })}
                </section>
              );
            })}
        </div>
      )}
    </div>
  );
}
