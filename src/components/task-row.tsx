"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { todayISO } from "@/lib/tz";
import { Avatar } from "./ui/avatar";
import { CheckButton } from "./check-button";

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type Task = {
  id: string;
  title: string;
  recurrence_type: string;
  recurrence_days: number[];
  recurrence_interval_days: number | null;
  assignment_type: string;
  assignee_id: string | null;
  points: number;
  start_date?: string;
  end_date?: string | null;
};

function recurrenceLabel(task: Task): string {
  const base = (() => {
    if (task.recurrence_type === "daily") return "Diário";
    if (task.recurrence_type === "weekly") {
      if (!task.recurrence_days?.length) return "Semanal";
      return task.recurrence_days.map((d) => DAY_NAMES[d]).join(" · ");
    }
    if (task.recurrence_type === "custom") {
      const n = task.recurrence_interval_days ?? 1;
      return `A cada ${n} dia${n > 1 ? "s" : ""}`;
    }
    return "";
  })();
  const today = todayISO();
  const short = (iso: string) => format(parseISO(iso), "d MMM", { locale: ptBR });
  let label = task.assignment_type === "rotation" ? `${base} · Rodízio` : base;
  if (task.end_date && task.end_date < today) label += " · Encerrada";
  else if (task.start_date && task.start_date > today) label += ` · Começa ${short(task.start_date)}`;
  else if (task.end_date) label += ` · Até ${short(task.end_date)}`;
  return label;
}

export function TaskRow({
  task,
  todayOccurrenceId,
  todayStatus,
  assigneeName,
  gamified,
}: {
  task: Task;
  todayOccurrenceId: string | null;
  todayStatus: string | null;
  assigneeName: string | null;
  gamified: boolean;
}) {
  const done = todayStatus === "done";
  const hasTodayOcc = !!todayOccurrenceId;
  const rotation = task.assignment_type === "rotation";

  return (
    <div className="flex items-center gap-3 rounded-[15px] bg-card p-[14px] shadow-[0_2px_7px_-3px_rgba(40,45,40,.07)]">
      <CheckButton
        occurrenceId={todayOccurrenceId}
        done={done}
        disabled={!hasTodayOcc}
        title={task.title}
      />

      <Link href={`/tasks/${task.id}/edit`} className="min-w-0 flex-1">
        <p className={cn("truncate font-bold tracking-tight", done && "text-faint line-through")}>
          {task.title}
        </p>
        <div className="mt-0.5 flex items-center gap-1.5">
          {!done && <span className="inline-block size-1.5 rounded-full bg-primary" />}
          <span className="text-xs font-semibold text-muted-foreground">{recurrenceLabel(task)}</span>
        </div>
      </Link>

      <div className="flex shrink-0 items-center gap-2">
        {gamified && task.points > 0 && !done && (
          <span className="text-xs font-bold text-gold">+{task.points}</span>
        )}
        {rotation ? (
          <span className="flex size-[30px] items-center justify-center rounded-full bg-muted text-muted-foreground">
            <RotateCcw className="size-4" />
          </span>
        ) : assigneeName ? (
          <Avatar name={assigneeName} size="md" className={cn("size-[30px] text-xs", done && "opacity-50")} />
        ) : null}
      </div>
    </div>
  );
}
