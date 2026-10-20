"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { dueDatesInRange, type RecurrenceType } from "@/lib/recurrence";
import { addDaysISO, todayISO } from "@/lib/tz";

const label = "mb-2.5 text-xs font-bold uppercase tracking-wide text-subtle";
const card = "rounded-[15px] bg-card p-3.5 shadow-[0_2px_7px_-3px_rgba(40,45,40,.07)]";
const dateInput =
  "w-full rounded-lg bg-track px-3 py-2.5 text-[15px] font-bold outline-none focus:ring-2 focus:ring-primary/40";

function Seg<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex gap-1 rounded-xl bg-track p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 rounded-[9px] py-2 text-[13.5px] font-semibold transition-colors",
            value === o.value ? "bg-primary text-white" : "text-muted-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const pretty = (iso: string) => format(parseISO(iso), "EEE, d 'de' MMM", { locale: ptBR });

/**
 * Quando a tarefa vale: começa **imediatamente** (padrão) ou **agendada** numa data, e opcionalmente
 * termina numa data. Para "a cada N dias" dá para informar a última vez que foi feito.
 * Envia startDate (sempre) e endDate (se houver) no formulário.
 */
export function TaskSchedule({
  recurrence,
  days,
  interval,
  initialStart,
  initialEnd,
  isEdit,
}: {
  recurrence: RecurrenceType;
  days: number[];
  interval: number;
  initialStart?: string;
  initialEnd?: string | null;
  isEdit: boolean;
}) {
  const today = todayISO();
  const scheduledAtStart = !!initialStart && initialStart > today;

  const [startMode, setStartMode] = useState<"now" | "date">(scheduledAtStart ? "date" : "now");
  const [startRaw, setStartRaw] = useState(scheduledAtStart ? initialStart! : addDaysISO(today, 1));
  const [lastDone, setLastDone] = useState("");
  const [endMode, setEndMode] = useState<"none" | "date">(initialEnd ? "date" : "none");
  const [endRaw, setEndRaw] = useState(initialEnd ?? addDaysISO(today, 9));

  // Início efetivo. Editando uma tarefa já em andamento, "imediata" mantém o início original
  // (senão o ciclo de "a cada N dias" seria reiniciado a cada edição).
  const keepsOriginalStart = isEdit && !!initialStart && initialStart <= today;
  // os campos de data guardam o texto cru (vazio enquanto a pessoa digita); sem data válida, usa o padrão
  const startDate = startRaw || addDaysISO(today, 1);
  const useLastDone = recurrence === "custom" && !!lastDone;
  const start = useLastDone
    ? addDaysISO(lastDone, interval)
    : startMode === "date"
      ? startDate
      : keepsOriginalStart
        ? initialStart!
        : today;
  const endDate = endRaw || addDaysISO(start, 9);
  const end = endMode === "date" ? endDate : null;
  const endBeforeStart = !!end && end < start;

  const first = endBeforeStart
    ? undefined
    : dueDatesInRange(
        { type: recurrence, startDate: start, days, intervalDays: interval, endDate: end },
        today,
        addDaysISO(today, 400),
      )[0];

  return (
    <div className="space-y-5">
      <input type="hidden" name="startDate" value={start} />
      {end && <input type="hidden" name="endDate" value={end} />}

      <div>
        <div className={label}>Começa</div>
        <div className={`${card} space-y-3`}>
          <Seg
            value={startMode}
            onChange={(v) => {
              setStartMode(v);
              setLastDone("");
            }}
            options={[
              { value: "now", label: "Imediata" },
              { value: "date", label: "Agendada" },
            ]}
          />
          {startMode === "now" && keepsOriginalStart && !useLastDone && (
            <p className="px-1 text-xs text-muted-foreground">Em andamento desde {pretty(initialStart!)}.</p>
          )}
          {startMode === "date" && (
            <input
              type="date"
              value={startRaw}
              onChange={(e) => {
                setStartRaw(e.target.value);
                setLastDone("");
              }}
              aria-label="Data de início"
              className={dateInput}
            />
          )}
          {recurrence === "custom" && (
            <div className="space-y-1.5 border-t border-border pt-3">
              <label className="px-1 text-xs font-semibold text-muted-foreground">
                Já fez antes? Informe a última vez
              </label>
              <input
                type="date"
                value={lastDone}
                max={today}
                onChange={(e) => setLastDone(e.target.value)}
                aria-label="Última vez que foi feito"
                className={dateInput}
              />
              {useLastDone && (
                <p className="px-1 text-xs text-muted-foreground">
                  A próxima será {interval} {interval === 1 ? "dia" : "dias"} depois.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div>
        <div className={label}>Termina</div>
        <div className={`${card} space-y-3`}>
          <Seg
            value={endMode}
            onChange={setEndMode}
            options={[
              { value: "none", label: "Sem fim" },
              { value: "date", label: "Em uma data" },
            ]}
          />
          {endMode === "date" && (
            <input
              type="date"
              value={endRaw}
              min={start}
              onChange={(e) => setEndRaw(e.target.value)}
              aria-label="Data de término"
              className={dateInput}
            />
          )}
          {endBeforeStart && (
            <p className="px-1 text-xs font-medium text-destructive">O término não pode ser antes do início.</p>
          )}
        </div>
      </div>

      <p
        className={cn(
          "rounded-xl px-3.5 py-2.5 text-[13px] font-semibold",
          first ? "bg-accent text-accent-foreground" : "bg-destructive-soft text-destructive",
        )}
      >
        {endBeforeStart
          ? "Ajuste as datas para ver a primeira ocorrência."
          : first
            ? `Primeira ocorrência: ${pretty(first)}`
            : "Nenhuma data cai nesse período — confira os dias e as datas."}
      </p>
    </div>
  );
}
