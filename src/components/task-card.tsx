"use client";

import { cn } from "@/lib/utils";
import { CheckButton } from "./check-button";

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
  const done = occurrence.status === "done";
  const task = occurrence.tasks as { title: string; points: number; spaces?: { name?: string } };
  const spaceName = task?.spaces?.name;

  return (
    <div className="flex items-center gap-3 rounded-[15px] bg-card p-[14px] shadow-[0_2px_7px_-3px_rgba(40,45,40,.07)]">
      <CheckButton occurrenceId={occurrence.id} done={done} title={task.title} />

      <div className="min-w-0 flex-1">
        <p className={cn("truncate font-bold tracking-tight", done && "text-faint line-through")}>
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
