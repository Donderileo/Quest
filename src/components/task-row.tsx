"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Check, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "./ui/avatar";
import { completeOccurrence } from "@/app/(app)/spaces/[id]/actions";

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
  return task.assignment_type === "rotation" ? `${base} · Rodízio` : base;
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
  const [pending, startTransition] = useTransition();
  const done = todayStatus === "done";
  const hasTodayOcc = !!todayOccurrenceId;
  const rotation = task.assignment_type === "rotation";

  function handleComplete() {
    if (done || !todayOccurrenceId) return;
    startTransition(() => completeOccurrence(todayOccurrenceId));
  }

  return (
    <div className="flex items-center gap-3 rounded-[15px] bg-card p-[14px] shadow-[0_2px_7px_-3px_rgba(40,45,40,.07)]">
      <button
        onClick={handleComplete}
        disabled={done || pending || !hasTodayOcc}
        aria-label={done ? "Concluído hoje" : hasTodayOcc ? "Marcar como feito hoje" : "Sem ocorrência hoje"}
        className={cn(
          "flex size-[25px] shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          done
            ? "border-primary bg-primary text-white"
            : "border-[#d6dad4] disabled:opacity-50",
        )}
      >
        {done && <Check className="size-3.5" strokeWidth={3} />}
      </button>

      <Link href={`/tasks/${task.id}/edit`} className="min-w-0 flex-1">
        <p className={cn("truncate font-bold tracking-tight", done && "text-[#b4b8b2] line-through")}>
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
