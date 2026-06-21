"use client";

import { useTransition } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Avatar } from "./ui/avatar";
import { completeOccurrence } from "@/app/(app)/spaces/[id]/actions";

function formatDueDate(dateStr: string): string {
  const d = parseISO(dateStr);
  if (isToday(d)) return "Hoje";
  if (isTomorrow(d)) return "Amanhã";
  return format(d, "EEE, d MMM", { locale: ptBR });
}

type Occurrence = {
  id: string;
  due_date: string;
  status: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tasks: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profiles: any;
};

export function TaskCard({
  occurrence,
  gamified,
}: {
  occurrence: Occurrence;
  gamified: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const done = occurrence.status === "done";
  const task = occurrence.tasks as { title: string; points: number };
  const profile = occurrence.profiles as { name: string; avatar_url: string | null } | null;

  function handleComplete() {
    if (done) return;
    startTransition(() => completeOccurrence(occurrence.id));
  }

  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-opacity",
        done && "opacity-50",
      )}
    >
      <button
        onClick={handleComplete}
        disabled={done || pending}
        aria-label={done ? "Concluído" : "Marcar como feito"}
        className="shrink-0 text-primary disabled:text-muted-foreground"
      >
        {done ? (
          <CheckCircle2 className="size-6" />
        ) : (
          <Circle className="size-6" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={cn("font-medium truncate", done && "line-through")}>{task.title}</p>
        <p className="text-xs text-muted-foreground">{formatDueDate(occurrence.due_date)}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {gamified && task.points > 0 && !done && (
          <span className="text-xs font-semibold text-gold">+{task.points}pts</span>
        )}
        {profile && <Avatar name={profile.name} src={profile.avatar_url} size="sm" />}
      </div>
    </li>
  );
}
