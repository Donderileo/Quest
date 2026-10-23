"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Check } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";
import { spaceEmoji } from "@/lib/space-icon";
import { balance, type BalanceMetric, type BalanceMode, type LoadTable } from "@/lib/balance";
import { buildBalanceInput, pointsAvailable, scopePeople, type BalanceData } from "@/lib/balance-data";
import { balanceTasks, undoBalance } from "../../actions";

const label = "mb-2.5 text-xs font-bold uppercase tracking-wide text-subtle";
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function Seg<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; disabled?: boolean }[];
}) {
  return (
    <div className="flex gap-1 rounded-xl bg-track p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 rounded-[9px] py-2.5 text-[13.5px] font-semibold transition-colors disabled:opacity-40",
            value === o.value ? "bg-primary text-white" : "text-muted-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** soma de todos os baldes por pessoa */
function totals(table: LoadTable, people: string[]) {
  const sum: Record<string, number> = Object.fromEntries(people.map((p) => [p, 0]));
  for (const bucket of Object.values(table)) for (const [u, n] of Object.entries(bucket)) if (u in sum) sum[u] += n;
  return sum;
}

export function BalanceForm({ homeId, data }: { homeId: string; data: BalanceData }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, start] = useTransition();

  const [everywhere, setEverywhere] = useState(true);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<BalanceMode>("daily");
  const [metric, setMetric] = useState<BalanceMetric>("count");
  const [error, setError] = useState<string | null>(null);

  const spaceIds = useMemo(() => (everywhere ? [] : [...chosen]), [everywhere, chosen]);
  const hasPoints = pointsAvailable(data, spaceIds);
  const effMetric: BalanceMetric = metric === "points" && hasPoints ? "points" : "count";
  const unit = effMetric === "points" ? "pts" : "tarefas";

  const people = useMemo(() => scopePeople(data, spaceIds), [data, spaceIds]);
  const input = useMemo(
    () => buildBalanceInput(data, { spaceIds, mode, metric: effMetric }),
    [data, spaceIds, mode, effMetric],
  );
  const plan = useMemo(() => balance(input), [input]);

  const ids = people.map((p) => p.id);
  const now = totals(plan.before, ids);
  const next = totals(plan.after, ids);
  const scale = Math.max(1, ...Object.values(now), ...Object.values(next));
  const rotationTasks = new Set(input.movable.map((o) => o.taskId)).size;

  const nothingToMove = input.movable.length === 0;
  const alreadyBalanced = !nothingToMove && plan.changes.length === 0;
  const canRun = !busy && plan.changes.length > 0 && (everywhere || chosen.size > 0);
  const bucketLabel = (key: string) =>
    key === "semana" ? "Total dos 7 dias" : format(parseISO(key), "EEE, d 'de' MMM", { locale: ptBR });
  const name = (id: string) => data.people.find((p) => p.id === id)?.name.split(" ")[0] ?? "—";

  function run() {
    setError(null);
    start(async () => {
      const res = await balanceTasks({ homeId, spaceIds, mode, metric: effMetric });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      router.refresh();
      if (res.changed === 0) {
        toast({ message: "Já estava balanceado" });
        return;
      }
      toast({
        message: `${plural(res.changed, "tarefa rebalanceada", "tarefas rebalanceadas")}`,
        ...(res.undo.length
          ? {
              actionLabel: "Desfazer",
              onAction: () =>
                start(async () => {
                  const back = await undoBalance({ homeId, assignments: res.undo });
                  if ("error" in back) setError(back.error);
                  else {
                    router.refresh();
                    toast({ message: "Balanceamento desfeito" });
                  }
                }),
            }
          : {}),
      });
    });
  }

  return (
    <div className="space-y-6 px-[22px] py-4">
      <div className="flex items-center gap-3">
        <Link
          href={`/homes/${homeId}/edit`}
          aria-label="Voltar"
          className="flex size-10 items-center justify-center rounded-xl bg-card shadow-[0_2px_6px_-2px_rgba(0,0,0,.12)]"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-extrabold">Balancear tarefas</h1>
      </div>

      <p className="text-sm text-muted-foreground">
        Veja como o rodízio dos próximos 7 dias está distribuído e deixe a carga igual entre as pessoas.
      </p>

      <div>
        <div className={label}>Onde</div>
        <Seg
          value={everywhere ? "all" : "some"}
          onChange={(v) => setEverywhere(v === "all")}
          options={[
            { value: "all", label: "Casa toda" },
            { value: "some", label: "Escolher ambientes" },
          ]}
        />
        {!everywhere && (
          <div className="mt-3 flex flex-col gap-2">
            {data.spaces.map((s) => {
              const on = chosen.has(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setChosen((prev) => {
                      const n = new Set(prev);
                      if (n.has(s.id)) n.delete(s.id);
                      else n.add(s.id);
                      return n;
                    })
                  }
                  className={cn(
                    "press flex items-center gap-3 rounded-[13px] p-3 shadow-[0_2px_7px_-3px_rgba(40,45,40,.07)]",
                    on ? "bg-accent" : "bg-card",
                  )}
                >
                  <span className="text-xl">{spaceEmoji(s.icon)}</span>
                  <span className="flex-1 text-left text-[15px] font-bold">{s.name}</span>
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-md border-2",
                      on ? "border-primary bg-primary text-white" : "border-strong",
                    )}
                  >
                    {on && <Check className="size-3" strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div className={label}>Equilibrar</div>
        <Seg
          value={mode}
          onChange={setMode}
          options={[
            { value: "daily", label: "Por dia" },
            { value: "weekly", label: "Na semana" },
          ]}
        />
        <p className="mx-0.5 mt-2 text-[12.5px] font-medium text-muted-foreground">
          {mode === "daily"
            ? "Cada dia fica equilibrado entre as pessoas."
            : "Só o total dos 7 dias fica igual; num dia uma pessoa pode pesar mais."}
        </p>
      </div>

      <div>
        <div className={label}>Medir por</div>
        <Seg
          value={effMetric}
          onChange={setMetric}
          options={[
            { value: "count", label: "Tarefas" },
            { value: "points", label: "Pontos", disabled: !hasPoints },
          ]}
        />
        {!hasPoints && (
          <p className="mx-0.5 mt-2 text-[12.5px] font-medium text-muted-foreground">
            Pontos aparecem quando há ambiente gamificado com tarefas que valem pontos.
          </p>
        )}
        {effMetric === "points" && (
          <p className="mx-0.5 mt-2 text-[12.5px] font-medium text-muted-foreground">
            Tarefas de ambientes sem pontos não entram nessa conta.
          </p>
        )}
      </div>

      {/* situação: agora × depois */}
      <div className="space-y-3">
        <div className={label}>Como está</div>
        {people.length < 2 ? (
          <p className="rounded-[15px] bg-muted p-4 text-sm font-semibold text-muted-foreground">
            É preciso ter pelo menos duas pessoas {everywhere ? "na casa" : "nesses ambientes"} para balancear.
          </p>
        ) : nothingToMove ? (
          <p className="rounded-[15px] bg-muted p-4 text-sm font-semibold text-muted-foreground">
            Não há tarefas de rodízio nos próximos 7 dias {everywhere ? "" : "nesses ambientes "}para mover. Tarefas fixas
            não mudam de responsável.
          </p>
        ) : (
          <>
            <div className="space-y-3 rounded-[15px] bg-card p-4 shadow-[0_2px_7px_-3px_rgba(40,45,40,.07)]">
              <div className="flex items-center justify-end gap-4 text-[11px] font-bold uppercase tracking-wide text-subtle">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-sm bg-strong" /> Agora
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-sm bg-primary" /> Depois
                </span>
              </div>
              {people.map((p) => (
                <div key={p.id} className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={p.name} src={p.avatar_url} size="sm" className="size-6 text-[10px]" />
                    <span className="flex-1 text-[14px] font-bold">{p.name}</span>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {now[p.id] ?? 0} → <span className="text-foreground">{next[p.id] ?? 0}</span> {unit}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-track">
                    <div className="h-full rounded-full bg-strong" style={{ width: `${((now[p.id] ?? 0) / scale) * 100}%` }} />
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-track">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-500"
                      style={{ width: `${((next[p.id] ?? 0) / scale) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              <p className="border-t border-border pt-3 text-xs font-semibold text-muted-foreground">
                Diferença {mode === "daily" ? "no pior dia" : "no total"} entre quem mais e quem menos faz:{" "}
                <span className="text-foreground">
                  {plan.spreadBefore} → {plan.spreadAfter}
                </span>{" "}
                {unit}
              </p>
            </div>

            <details className="rounded-[15px] bg-card p-4 text-sm shadow-[0_2px_7px_-3px_rgba(40,45,40,.07)]">
              <summary className="cursor-pointer font-bold">Ver {mode === "daily" ? "por dia" : "o detalhe"}</summary>
              <div className="mt-3 space-y-3">
                {Object.keys(plan.before)
                  .sort()
                  .map((key) => (
                    <div key={key} className="space-y-0.5">
                      <p className="text-xs font-bold uppercase tracking-wide text-subtle">{bucketLabel(key)}</p>
                      <p className="text-[13px] text-muted-foreground">
                        {ids.map((id, i) => (
                          <span key={id}>
                            {i > 0 && " · "}
                            {name(id)} {plan.before[key][id] ?? 0}
                            <span className="text-subtle"> → </span>
                            <span className="font-bold text-foreground">{plan.after[key][id] ?? 0}</span>
                          </span>
                        ))}
                      </p>
                    </div>
                  ))}
              </div>
            </details>

            <p
              className={cn(
                "rounded-xl px-3.5 py-2.5 text-[13px] font-semibold",
                alreadyBalanced ? "bg-accent text-accent-foreground" : "bg-muted text-foreground",
              )}
            >
              {alreadyBalanced
                ? "Já está balanceado 🎉"
                : `${plural(plan.changes.length, "tarefa mudaria", "tarefas mudariam")} de responsável (${plural(rotationTasks, "rodízio", "rodízios")} no escopo).`}
            </p>
          </>
        )}
      </div>

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      <div className="space-y-2.5">
        <button
          type="button"
          disabled={!canRun}
          onClick={run}
          className="press flex h-[52px] w-full items-center justify-center rounded-[15px] bg-primary text-[15px] font-bold text-white shadow-[0_8px_18px_-7px_rgba(74,124,89,.5)] disabled:opacity-40 disabled:shadow-none"
        >
          {busy ? "Balanceando…" : "Balancear"}
        </button>
        <p className="px-1 text-center text-xs text-muted-foreground">
          Tarefas fixas e já concluídas contam como carga, mas não mudam. Editar um rodízio depois refaz a distribuição
          dele.
        </p>
      </div>
    </div>
  );
}
