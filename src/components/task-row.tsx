import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronRight, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import { todayISO } from "@/lib/tz";

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export type TaskTemplate = {
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
  assignee: { name: string } | null;
  rotation?: { position: number; profiles: { name: string } | null }[];
};

function recurrenceLabel(task: TaskTemplate): string {
  if (task.recurrence_type === "daily") return "Todo dia";
  if (task.recurrence_type === "weekly") {
    return task.recurrence_days?.length
      ? task.recurrence_days.map((d) => DAY_NAMES[d]).join(" · ")
      : "Toda semana";
  }
  const n = task.recurrence_interval_days ?? 1;
  return `A cada ${n} dia${n > 1 ? "s" : ""}`;
}

function periodLabel(task: TaskTemplate): { text: string; ended: boolean } | null {
  const today = todayISO();
  const short = (iso: string) => format(parseISO(iso), "d MMM", { locale: ptBR });
  if (task.end_date && task.end_date < today) return { text: `Encerrada em ${short(task.end_date)}`, ended: true };
  if (task.start_date && task.start_date > today) {
    return { text: `Começa ${short(task.start_date)}${task.end_date ? ` · até ${short(task.end_date)}` : ""}`, ended: false };
  }
  if (task.end_date) return { text: `Até ${short(task.end_date)}`, ended: false };
  return null;
}

function whoLabel(task: TaskTemplate): string {
  if (task.assignment_type === "rotation") {
    const names = (task.rotation ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((r) => r.profiles?.name)
      .filter(Boolean);
    return names.length ? `Rodízio: ${names.join(" → ")}` : "Rodízio (sem fila definida)";
  }
  return task.assignee ? `Responsável: ${task.assignee.name}` : "Sem responsável";
}

/**
 * A tarefa em si (o "modelo"), não uma ocorrência do calendário: sem check, sem "feita por".
 * Tocar abre a edição; mudanças valem de hoje em diante.
 */
export function TaskRow({ task, gamified }: { task: TaskTemplate; gamified: boolean }) {
  const period = periodLabel(task);
  return (
    <Link
      href={`/tasks/${task.id}/edit`}
      className={cn(
        "press flex items-center gap-3 rounded-[15px] bg-card p-[14px] shadow-[0_2px_7px_-3px_rgba(40,45,40,.07)]",
        period?.ended && "opacity-60",
      )}
    >
      <span className="flex size-[38px] shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <Repeat className="size-[18px]" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold tracking-tight">{task.title}</p>
        <p className="mt-0.5 truncate text-xs font-semibold text-muted-foreground">
          {recurrenceLabel(task)}
          {period && <span className={period.ended ? "text-destructive" : undefined}> · {period.text}</span>}
        </p>
        <p className="truncate text-xs text-subtle">{whoLabel(task)}</p>
      </div>
      {gamified && task.points > 0 && <span className="shrink-0 text-xs font-bold text-gold">{task.points} pts</span>}
      <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden />
    </Link>
  );
}
