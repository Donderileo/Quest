"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { completeOccurrence } from "@/app/(app)/spaces/[id]/actions";

type Occurrence = {
  id: string;
  due_date: string;
  status: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tasks: any;
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
  const task = occurrence.tasks as { title: string; points: number; spaces?: { name?: string } };
  const spaceName = task?.spaces?.name;

  function handleComplete() {
    if (done) return;
    startTransition(() => completeOccurrence(occurrence.id));
  }

  return (
    <div className="flex items-center gap-3 rounded-[15px] bg-card p-[14px] shadow-[0_2px_7px_-3px_rgba(40,45,40,.07)]">
      <button
        onClick={handleComplete}
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
          {task.title}
        </p>
        {spaceName && (
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="inline-block size-1.5 rounded-full bg-primary" />
            <span className="text-xs font-semibold text-muted-foreground">{spaceName}</span>
          </div>
        )}
      </div>

      {gamified && task.points > 0 && !done && (
        <span className="shrink-0 text-xs font-bold text-gold">+{task.points}</span>
      )}
    </div>
  );
}
