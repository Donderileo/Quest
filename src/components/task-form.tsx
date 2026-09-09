"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const DAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

export type Member = { id: string; name: string; avatar_url: string | null };

export type TaskFormInitial = {
  title: string;
  recurrenceType: "daily" | "weekly" | "custom";
  recurrenceDays: number[];
  recurrenceIntervalDays: number;
  assignmentType: "fixed" | "rotation";
  assigneeId: string | null;
  rotationOrder: string[];
  points: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Action = (prev: any, formData: FormData) => any;

export function TaskForm({
  spaceId,
  taskId,
  gamified,
  members,
  initial,
  action,
  onDelete,
}: {
  spaceId: string;
  taskId?: string;
  gamified: boolean;
  members: Member[];
  initial: TaskFormInitial;
  action: Action;
  onDelete?: () => void | Promise<unknown>;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [deleting, startDelete] = useTransition();

  const [recurrence, setRecurrence] = useState(initial.recurrenceType);
  const [selectedDays, setSelectedDays] = useState<number[]>(initial.recurrenceDays);
  const [interval, setInterval] = useState(initial.recurrenceIntervalDays);
  const [assignment, setAssignment] = useState(initial.assignmentType);
  const [assigneeId, setAssigneeId] = useState<string | null>(initial.assigneeId ?? members[0]?.id ?? null);
  const [rotationOrder, setRotationOrder] = useState<string[]>(initial.rotationOrder);
  const [points, setPoints] = useState(initial.points);

  function toggleDay(d: number) {
    setSelectedDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }
  function toggleRotation(userId: string) {
    setRotationOrder((prev) =>
      prev.includes(userId) ? prev.filter((x) => x !== userId) : [...prev, userId],
    );
  }

  const memberById = new Map(members.map((m) => [m.id, m]));

  function handleDelete() {
    if (!onDelete) return;
    if (!confirm("Excluir esta tarefa?")) return;
    startDelete(() => {
      void onDelete();
    });
  }

  return (
    <form action={formAction} className="flex min-h-full flex-col">
      <div className="flex items-center justify-between px-[22px] py-3">
        <Link href={`/spaces/${spaceId}`} className="text-[15px] font-semibold text-muted-foreground">
          Cancelar
        </Link>
        <span className="text-[17px] font-extrabold tracking-tight">
          {taskId ? "Editar tarefa" : "Nova tarefa"}
        </span>
        <button type="submit" disabled={pending} className="text-[15px] font-bold text-primary disabled:text-[#c2c6c0]">
          {pending ? "..." : "Salvar"}
        </button>
      </div>

      <div className="space-y-5 px-[22px] pb-8 pt-1">
        <input type="hidden" name="spaceId" value={spaceId} />
        {taskId && <input type="hidden" name="taskId" value={taskId} />}
        <input type="hidden" name="recurrenceType" value={recurrence} />
        <input type="hidden" name="assignmentType" value={assignment} />
        <input type="hidden" name="points" value={points} />
        {recurrence === "weekly" &&
          selectedDays.map((d) => <input key={d} type="hidden" name="recurrenceDays" value={d} />)}
        {recurrence === "custom" && <input type="hidden" name="recurrenceIntervalDays" value={interval} />}
        {assignment === "fixed" && assigneeId && <input type="hidden" name="assigneeId" value={assigneeId} />}
        {assignment === "rotation" &&
          rotationOrder.map((uid) => <input key={uid} type="hidden" name="rotationUserIds" value={uid} />)}

        {/* título */}
        <div>
          <div className="mb-2.5 text-xs font-bold uppercase tracking-wide text-[#9aa09b]">Tarefa</div>
          <input
            name="title"
            defaultValue={initial.title}
            placeholder="ex: Lavar a louça"
            autoFocus={!taskId}
            required
            className="w-full rounded-[15px] bg-card p-4 text-[17px] font-bold text-foreground shadow-[0_2px_7px_-3px_rgba(40,45,40,.07)] outline-none placeholder:font-semibold placeholder:text-[#c2c6c0] focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {/* recorrência */}
        <div>
          <div className="mb-2.5 text-xs font-bold uppercase tracking-wide text-[#9aa09b]">Repete</div>
          <div className="rounded-[15px] bg-card p-3.5 shadow-[0_2px_7px_-3px_rgba(40,45,40,.07)]">
            <div className="flex gap-1 rounded-xl bg-[#f1efe9] p-1">
              {(["daily", "weekly", "custom"] as const).map((r) => {
                const labels = { daily: "Diário", weekly: "Semanal", custom: "Intervalo" };
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRecurrence(r)}
                    className={cn(
                      "flex-1 rounded-[9px] py-2 text-[13.5px] font-semibold transition-colors",
                      recurrence === r ? "bg-primary text-white" : "text-muted-foreground",
                    )}
                  >
                    {labels[r]}
                  </button>
                );
              })}
            </div>

            {recurrence === "weekly" && (
              <div className="mt-3.5 flex justify-between">
                {DAYS.map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={cn(
                      "flex size-9 items-center justify-center rounded-full text-[13px] font-bold transition-colors",
                      selectedDays.includes(i) ? "bg-primary text-white" : "bg-[#f1efe9] text-[#a9aea8]",
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}

            {recurrence === "custom" && (
              <div className="mt-3.5 flex items-center gap-2 px-1">
                <span className="text-sm font-medium text-muted-foreground">A cada</span>
                <input
                  type="number"
                  min={1}
                  value={interval}
                  onChange={(e) => setInterval(Math.max(1, Number(e.target.value)))}
                  className="w-16 rounded-lg bg-[#f1efe9] px-3 py-1.5 text-center font-bold outline-none"
                />
                <span className="text-sm font-medium text-muted-foreground">dias</span>
              </div>
            )}
          </div>
        </div>

        {/* responsável */}
        <div>
          <div className="mb-2.5 text-xs font-bold uppercase tracking-wide text-[#9aa09b]">Responsável</div>
          <div className="rounded-[15px] bg-card p-3.5 shadow-[0_2px_7px_-3px_rgba(40,45,40,.07)]">
            <div className="flex gap-1 rounded-xl bg-[#f1efe9] p-1">
              {(["fixed", "rotation"] as const).map((a) => {
                const labels = { fixed: "Fixo", rotation: "Rodízio" };
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAssignment(a)}
                    className={cn(
                      "flex-1 rounded-[9px] py-2 text-[13.5px] font-semibold transition-colors",
                      assignment === a ? "bg-primary text-white" : "text-muted-foreground",
                    )}
                  >
                    {labels[a]}
                  </button>
                );
              })}
            </div>

            <p className="mx-0.5 my-2.5 text-[12.5px] font-medium text-muted-foreground">
              {assignment === "fixed"
                ? "Sempre a mesma pessoa cuida desta tarefa."
                : "Cada um faz uma vez, nesta ordem, em rodízio."}
            </p>

            {members.length === 0 ? (
              <p className="py-2 text-center text-[13px] text-muted-foreground">
                Nenhum membro neste ambiente ainda.
              </p>
            ) : assignment === "fixed" ? (
              <div className="flex flex-col gap-2">
                {members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setAssigneeId(m.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-[11px] p-2 transition-colors",
                      assigneeId === m.id ? "bg-accent" : "bg-[#f8f7f3]",
                    )}
                  >
                    <Avatar name={m.name} src={m.avatar_url} size="sm" className="size-7 text-[11px]" />
                    <span className="flex-1 text-left text-[15px] font-bold">{m.name}</span>
                    <span
                      className={cn(
                        "flex size-5 items-center justify-center rounded-full border-2",
                        assigneeId === m.id ? "border-primary bg-primary" : "border-[#cdd1cb]",
                      )}
                    >
                      {assigneeId === m.id && <span className="size-2 rounded-full bg-white" />}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {rotationOrder.map((uid, idx) => {
                  const m = memberById.get(uid);
                  if (!m) return null;
                  return (
                    <button
                      key={uid}
                      type="button"
                      onClick={() => toggleRotation(uid)}
                      className="flex items-center gap-3 rounded-[11px] bg-accent p-2"
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-primary text-[11px] font-extrabold text-white">
                        {idx + 1}
                      </span>
                      <Avatar name={m.name} src={m.avatar_url} size="sm" className="size-7 text-[11px]" />
                      <span className="flex-1 text-left text-[15px] font-bold">{m.name}</span>
                    </button>
                  );
                })}
                {members
                  .filter((m) => !rotationOrder.includes(m.id))
                  .map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleRotation(m.id)}
                      className="flex items-center gap-3 rounded-[11px] bg-[#f8f7f3] p-2"
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-[#cdd1cb] text-[11px] font-extrabold text-white">
                        +
                      </span>
                      <Avatar name={m.name} src={m.avatar_url} size="sm" className="size-7 text-[11px]" />
                      <span className="flex-1 text-left text-[15px] font-bold text-muted-foreground">{m.name}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* pontos */}
        {gamified && (
          <div>
            <div className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#9aa09b]">
              Pontos
              <span className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-[10px] font-bold normal-case tracking-normal text-accent-foreground">
                <span className="inline-block size-[5px] rotate-45 bg-primary" />
                Ambiente gamificado
              </span>
            </div>
            <div className="flex items-center justify-between rounded-[15px] bg-card p-4 shadow-[0_2px_7px_-3px_rgba(40,45,40,.07)]">
              <span className="text-[15px] font-bold">Pontos por conclusão</span>
              <div className="flex items-center gap-3.5">
                <button
                  type="button"
                  onClick={() => setPoints((p) => Math.max(0, p - 5))}
                  className="flex size-8 items-center justify-center rounded-[10px] bg-[#f1efe9] text-lg font-bold text-muted-foreground"
                >
                  −
                </button>
                <span className="min-w-[46px] text-center text-lg font-extrabold">{points}</span>
                <button
                  type="button"
                  onClick={() => setPoints((p) => p + 5)}
                  className="flex size-8 items-center justify-center rounded-[10px] bg-primary text-lg font-bold text-white"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}

        {state?.error && <p className="text-sm font-medium text-destructive">{state.error}</p>}

        {onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex h-[50px] w-full items-center justify-center gap-2 rounded-[15px] border-[1.5px] border-destructive/30 text-[15px] font-bold text-destructive disabled:opacity-50"
          >
            <Trash2 className="size-[18px]" />
            {deleting ? "Excluindo…" : "Excluir tarefa"}
          </button>
        )}
      </div>
    </form>
  );
}
