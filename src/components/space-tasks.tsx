"use client";

import { useState, useTransition } from "react";
import { Check, RotateCcw } from "lucide-react";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Avatar } from "./ui/avatar";
import { TaskRow } from "./task-row";
import { completeOccurrence } from "@/app/(app)/spaces/[id]/actions";

type Profile = { name: string; avatar_url: string | null } | null;

type Task = {
  id: string;
  title: string;
  recurrence_type: string;
  recurrence_days: number[];
  recurrence_interval_days: number | null;
  assignment_type: string;
  assignee_id: string | null;
  points: number;
  assignee: { name: string } | null;
};

type Occurrence = {
  id: string;
  task_id: string;
  due_date: string;
  status: string;
  completed_at: string | null;
  tasks: { title: string; points: number };
  assignee: Profile;
  completer: { name: string } | null;
};

type Tab = "hoje" | "semana" | "tudo";

function dayLabel(dateStr: string): string {
  const d = parseISO(dateStr);
  if (isToday(d)) return `Hoje · ${format(d, "d MMM", { locale: ptBR })}`;
  if (isTomorrow(d)) return `Amanhã · ${format(d, "d MMM", { locale: ptBR })}`;
  return format(d, "EEEE · d MMM", { locale: ptBR });
}

function OccurrenceRow({ occ, gamified }: { occ: Occurrence; gamified: boolean }) {
  const [pending, start] = useTransition();
  const done = occ.status === "done";

  function complete() {
    if (done) return;
    start(() => {
      void completeOccurrence(occ.id);
    });
  }

  const doneInfo =
    done && occ.completed_at
      ? `Feito${occ.completer ? ` por ${occ.completer.name}` : ""} · ${format(parseISO(occ.completed_at), "HH:mm")}`
      : null;

  return (
    <div className="flex items-center gap-3 rounded-[15px] bg-card p-[14px] shadow-[0_2px_7px_-3px_rgba(40,45,40,.07)]">
      <button
        onClick={complete}
        disabled={done || pending}
        aria-label={done ? "Concluído" : "Marcar como feito"}
        className={cn(
          "flex size-[25px] shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          done ? "border-primary bg-primary text-white" : "border-[#d6dad4]",
        )}
      >
        {done && <Check className="size-3.5" strokeWidth={3} />}
      </button>

      <div className="min-w-0 flex-1">
        <p className={cn("truncate font-bold tracking-tight", done && "text-[#b4b8b2] line-through")}>
          {occ.tasks.title}
        </p>
        <div className="mt-0.5 text-xs font-semibold text-muted-foreground">
          {doneInfo ?? (occ.assignee ? occ.assignee.name : "Sem responsável")}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {gamified && occ.tasks.points > 0 && !done && (
          <span className="text-xs font-bold text-gold">+{occ.tasks.points}</span>
        )}
        {occ.assignee ? (
          <Avatar name={occ.assignee.name} src={occ.assignee.avatar_url} size="md" className={cn("size-[30px] text-xs", done && "opacity-50")} />
        ) : (
          <span className="flex size-[30px] items-center justify-center rounded-full bg-muted text-muted-foreground">
            <RotateCcw className="size-4" />
          </span>
        )}
      </div>
    </div>
  );
}

export function SpaceTasks({
  today,
  gamified,
  tasks,
  occurrences,
}: {
  today: string;
  gamified: boolean;
  tasks: Task[];
  occurrences: Occurrence[];
}) {
  const [tab, setTab] = useState<Tab>("hoje");

  const todayOccs = occurrences.filter((o) => o.due_date === today);
  const todayByTask = new Map(todayOccs.map((o) => [o.task_id, o]));

  // semana agrupada por dia
  const byDay = new Map<string, Occurrence[]>();
  for (const o of occurrences) {
    if (!byDay.has(o.due_date)) byDay.set(o.due_date, []);
    byDay.get(o.due_date)!.push(o);
  }
  const days = [...byDay.keys()].sort();

  return (
    <section className="space-y-4">
      {/* segmented */}
      <div className="flex gap-1 rounded-[13px] bg-[#eae8e1] p-1">
        {([
          { v: "hoje", label: "Hoje" },
          { v: "semana", label: "Esta semana" },
          { v: "tudo", label: "Tudo" },
        ] as const).map(({ v, label }) => (
          <button
            key={v}
            type="button"
            onClick={() => setTab(v)}
            className={cn(
              "flex-1 rounded-[10px] py-2 text-[13.5px] font-semibold transition-colors",
              tab === v ? "bg-card text-foreground shadow-[0_1px_3px_rgba(0,0,0,.08)]" : "text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* HOJE */}
      {tab === "hoje" &&
        (todayOccs.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Nada para hoje. 🎉</p>
        ) : (
          <div className="space-y-[9px]">
            {todayOccs.map((o) => (
              <OccurrenceRow key={o.id} occ={o} gamified={gamified} />
            ))}
          </div>
        ))}

      {/* SEMANA */}
      {tab === "semana" &&
        (days.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Nada nos próximos dias.</p>
        ) : (
          <div className="space-y-5">
            {days.map((day) => (
              <div key={day} className="space-y-[9px]">
                <h3 className="text-xs font-bold uppercase tracking-wide text-[#9aa09b]">{dayLabel(day)}</h3>
                {byDay.get(day)!.map((o) => (
                  <OccurrenceRow key={o.id} occ={o} gamified={gamified} />
                ))}
              </div>
            ))}
          </div>
        ))}

      {/* TUDO (definições de tarefa, editáveis) */}
      {tab === "tudo" &&
        (tasks.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma tarefa cadastrada ainda.</p>
        ) : (
          <div className="space-y-[9px]">
            {tasks.map((task) => {
              const occ = todayByTask.get(task.id);
              return (
                <TaskRow
                  key={task.id}
                  task={task}
                  todayOccurrenceId={occ?.id ?? null}
                  todayStatus={occ?.status ?? null}
                  assigneeName={task.assignee?.name ?? null}
                  gamified={gamified}
                />
              );
            })}
          </div>
        ))}
    </section>
  );
}
