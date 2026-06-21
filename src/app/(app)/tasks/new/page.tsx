"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { createTask } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function NewTaskForm() {
  const [state, action, pending] = useActionState(createTask, null);
  const searchParams = useSearchParams();
  const spaceId = searchParams.get("spaceId") ?? "";

  const [recurrence, setRecurrence] = useState<"daily" | "weekly" | "custom">("weekly");
  const [assignment, setAssignment] = useState<"fixed" | "rotation">("fixed");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  function toggleDay(d: number) {
    setSelectedDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href={spaceId ? `/spaces/${spaceId}` : "/homes"} className="text-muted-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-bold">Nova tarefa</h1>
      </div>

      <form action={action} className="space-y-5">
        <input type="hidden" name="spaceId" value={spaceId} />

        <FormField label="Título">
          <Input name="title" placeholder="ex: Lavar a louça" autoFocus required />
        </FormField>

        {/* Recorrência */}
        <FormField label="Recorrência">
          <div className="grid grid-cols-3 gap-2">
            {(["daily", "weekly", "custom"] as const).map((r) => {
              const labels = { daily: "Diário", weekly: "Semanal", custom: "Intervalo" };
              return (
                <label
                  key={r}
                  className="flex cursor-pointer items-center justify-center rounded-lg border border-border bg-card p-2.5 text-sm font-medium has-[:checked]:border-primary has-[:checked]:bg-accent"
                >
                  <input
                    type="radio"
                    name="recurrenceType"
                    value={r}
                    checked={recurrence === r}
                    onChange={() => setRecurrence(r)}
                    className="sr-only"
                  />
                  {labels[r]}
                </label>
              );
            })}
          </div>

          {recurrence === "weekly" && (
            <div className="flex gap-1 mt-2">
              {DAYS.map((d, i) => (
                <button
                  key={i}
                  type="button"
                  name="recurrenceDays"
                  onClick={() => toggleDay(i)}
                  className={`flex-1 rounded-lg py-2 text-xs font-medium transition-colors ${
                    selectedDays.includes(i)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {d}
                </button>
              ))}
              {selectedDays.map((d) => (
                <input key={d} type="hidden" name="recurrenceDays" value={d} />
              ))}
            </div>
          )}

          {recurrence === "custom" && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-muted-foreground">A cada</span>
              <Input
                name="recurrenceIntervalDays"
                type="number"
                min={1}
                defaultValue={7}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">dias</span>
            </div>
          )}
        </FormField>

        {/* Atribuição */}
        <FormField label="Responsável">
          <div className="grid grid-cols-2 gap-2">
            {(["fixed", "rotation"] as const).map((a) => {
              const labels = { fixed: "Fixo", rotation: "Rodízio" };
              const descs = { fixed: "Sempre a mesma pessoa", rotation: "Uma vez cada um" };
              return (
                <label
                  key={a}
                  className="flex cursor-pointer flex-col gap-0.5 rounded-xl border border-border bg-card p-3 has-[:checked]:border-primary has-[:checked]:bg-accent"
                >
                  <input
                    type="radio"
                    name="assignmentType"
                    value={a}
                    checked={assignment === a}
                    onChange={() => setAssignment(a)}
                    className="sr-only"
                  />
                  <span className="font-semibold text-sm">{labels[a]}</span>
                  <span className="text-xs text-muted-foreground">{descs[a]}</span>
                </label>
              );
            })}
          </div>
        </FormField>

        <FormField label="Pontos (opcional)">
          <Input name="points" type="number" min={0} defaultValue={0} className="w-24" />
        </FormField>

        {state?.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={pending}>
          {pending ? "Criando…" : "Criar tarefa"}
        </Button>
      </form>
    </div>
  );
}

export default function NewTaskPage() {
  return (
    <Suspense fallback={null}>
      <NewTaskForm />
    </Suspense>
  );
}
