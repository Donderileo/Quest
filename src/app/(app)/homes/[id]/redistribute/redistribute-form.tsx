"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { spaceEmoji } from "@/lib/space-icon";
import { redistributeTasks } from "../../actions";

type Person = { id: string; name: string; avatar_url: string | null };
type Task = { id: string; spaceId: string; type: "fixed" | "rotation"; assigneeId: string | null };

const NONE = "none";
const label = "mb-2.5 text-xs font-bold uppercase tracking-wide text-subtle";
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function RedistributeForm({
  homeId,
  meId,
  people,
  spaces,
  tasks,
  queue,
  spaceMembers,
}: {
  homeId: string;
  meId: string;
  people: Person[];
  spaces: { id: string; name: string; icon: string | null }[];
  tasks: Task[];
  queue: { task_id: string; user_id: string }[];
  spaceMembers: { spaceId: string; userId: string }[];
}) {
  const router = useRouter();
  const [busy, start] = useTransition();

  // tarefas por pessoa (fixas + rodízios em que participa)
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    const add = (k: string) => map.set(k, (map.get(k) ?? 0) + 1);
    for (const t of tasks) if (t.type === "fixed") add(t.assigneeId ?? NONE);
    for (const q of queue) add(q.user_id);
    return map;
  }, [tasks, queue]);

  const unassigned = tasks.filter((t) => t.type === "fixed" && !t.assigneeId).length;

  // padrões: de = quem tem mais (você, se tiver); para = outra pessoa com menos
  const defaultFrom = (counts.get(meId) ?? 0) > 0
    ? meId
    : [...people].sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0))[0]?.id ?? meId;
  const defaultTo =
    [...people].filter((p) => p.id !== defaultFrom).sort((a, b) => (counts.get(a.id) ?? 0) - (counts.get(b.id) ?? 0))[0]
      ?.id ?? "";

  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [everywhere, setEverywhere] = useState(true);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [done, setDone] = useState<null | { fixed: number; rotations: number; to: string; mode: "move" | "split" }>(null);
  const [error, setError] = useState<string | null>(null);

  const byId = new Map(people.map((p) => [p.id, p]));
  const fromName = from === NONE ? "Sem responsável" : byId.get(from)?.name ?? "—";
  const toName = byId.get(to)?.name ?? "—";
  const inScope = (spaceId: string) => everywhere || chosen.has(spaceId);

  const fixedCount = tasks.filter(
    (t) => t.type === "fixed" && inScope(t.spaceId) && (from === NONE ? !t.assigneeId : t.assigneeId === from),
  ).length;
  const rotationCount =
    from === NONE
      ? 0
      : tasks.filter(
          (t) => t.type === "rotation" && inScope(t.spaceId) && queue.some((q) => q.task_id === t.id && q.user_id === from),
        ).length;
  const total = fixedCount + rotationCount;

  const scopedSpaces = spaces.filter((s) => inScope(s.id));
  const joining = scopedSpaces.filter((s) => !spaceMembers.some((m) => m.spaceId === s.id && m.userId === to)).length;

  const canRun = !busy && !!to && from !== to && total > 0 && (everywhere || chosen.size > 0);

  function run(mode: "move" | "split") {
    const verb = mode === "move" ? `Passar ${plural(total, "tarefa", "tarefas")} de ${fromName} para ${toName}?` : `Dividir as tarefas de ${fromName} entre ${fromName} e ${toName}?`;
    if (!confirm(verb)) return;
    setError(null);
    start(async () => {
      const res = await redistributeTasks({
        homeId,
        from,
        to,
        mode,
        spaceIds: everywhere ? [] : [...chosen],
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setDone({ fixed: res.fixed, rotations: res.rotations, to: toName, mode });
      router.refresh();
    });
  }

  function pick({ value, onChange, exclude, withNone }: { value: string; onChange: (v: string) => void; exclude?: string; withNone?: boolean }) {
    const options = [
      ...(withNone && unassigned > 0 ? [{ id: NONE, name: "Sem responsável", avatar_url: null as string | null }] : []),
      ...people.filter((p) => p.id !== exclude),
    ];
    return (
      <div className="flex flex-col gap-2">
        {options.map((p) => {
          const on = value === p.id;
          const n = p.id === NONE ? unassigned : counts.get(p.id) ?? 0;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(p.id)}
              aria-pressed={on}
              className={cn(
                "press flex items-center gap-3 rounded-[13px] p-2.5 shadow-[0_2px_7px_-3px_rgba(40,45,40,.07)] transition-colors",
                on ? "bg-accent ring-2 ring-primary" : "bg-card",
              )}
            >
              {p.id === NONE ? (
                <span className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">?</span>
              ) : (
                <Avatar name={p.name} src={p.avatar_url} size="md" className="size-8 text-xs" />
              )}
              <span className="flex-1 text-left text-[15px] font-bold">
                {p.name}
                {p.id === meId && <span className="ml-1.5 text-xs font-semibold text-muted-foreground">(você)</span>}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">{plural(n, "tarefa", "tarefas")}</span>
              <span className={cn("flex size-5 items-center justify-center rounded-full border-2", on ? "border-primary bg-primary text-white" : "border-strong")}>
                {on && <Check className="size-3" strokeWidth={3} />}
              </span>
            </button>
          );
        })}
      </div>
    );
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
        <h1 className="text-2xl font-extrabold">Redistribuir tarefas</h1>
      </div>

      <p className="text-sm text-muted-foreground">
        Passe as tarefas de uma pessoa para outra de uma só vez. Ideal quando alguém entra na casa depois de tudo montado.
      </p>

      {done ? (
        <div className="space-y-4 rounded-[18px] bg-accent p-5 text-accent-foreground">
          <p className="text-lg font-extrabold">Pronto! 🎉</p>
          <p className="text-sm font-semibold">
            {done.mode === "move"
              ? `${plural(done.fixed, "tarefa", "tarefas")}${done.rotations ? ` e ${plural(done.rotations, "rodízio", "rodízios")}` : ""} agora ${done.fixed + done.rotations === 1 ? "é" : "são"} de ${done.to}.`
              : `As tarefas foram divididas com ${done.to}.`}{" "}
            As ocorrências de hoje em diante já foram atualizadas.
          </p>
          <div className="flex gap-2">
            <Link href="/tasks" className="press flex h-11 flex-1 items-center justify-center rounded-[13px] bg-primary text-sm font-bold text-white">
              Ver tarefas
            </Link>
            <button type="button" onClick={() => setDone(null)} className="press h-11 flex-1 rounded-[13px] bg-card text-sm font-bold text-foreground">
              Fazer outra
            </button>
          </div>
        </div>
      ) : (
        <>
          <div>
            <div className={label}>De</div>
            {pick({
              value: from,
              onChange: (v) => {
                setFrom(v);
                if (v === to) setTo("");
              },
              withNone: true,
            })}
          </div>

          <div>
            <div className={label}>Para</div>
            {pick({ value: to, onChange: setTo, exclude: from === NONE ? undefined : from })}
          </div>

          <div>
            <div className={label}>Onde</div>
            <div className="flex gap-1 rounded-xl bg-track p-1">
              {([
                { v: true, text: "Casa toda" },
                { v: false, text: "Escolher ambientes" },
              ] as const).map(({ v, text }) => (
                <button
                  key={text}
                  type="button"
                  onClick={() => setEverywhere(v)}
                  className={cn(
                    "flex-1 rounded-[9px] py-2.5 text-[13.5px] font-semibold transition-colors",
                    everywhere === v ? "bg-primary text-white" : "text-muted-foreground",
                  )}
                >
                  {text}
                </button>
              ))}
            </div>
            {!everywhere && (
              <div className="mt-3 flex flex-col gap-2">
                {spaces.map((s) => {
                  const on = chosen.has(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setChosen((prev) => {
                          const next = new Set(prev);
                          if (next.has(s.id)) next.delete(s.id);
                          else next.add(s.id);
                          return next;
                        })
                      }
                      className={cn("press flex items-center gap-3 rounded-[13px] p-3 shadow-[0_2px_7px_-3px_rgba(40,45,40,.07)]", on ? "bg-accent" : "bg-card")}
                    >
                      <span className="text-xl">{spaceEmoji(s.icon)}</span>
                      <span className="flex-1 text-left text-[15px] font-bold">{s.name}</span>
                      <span className={cn("flex size-5 items-center justify-center rounded-md border-2", on ? "border-primary bg-primary text-white" : "border-strong")}>
                        {on && <Check className="size-3" strokeWidth={3} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* prévia */}
          <div className={cn("rounded-[15px] p-4 text-sm font-semibold", total > 0 && to && from !== to ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground")}>
            {!to || from === to ? (
              "Escolha quem vai receber as tarefas."
            ) : total === 0 ? (
              `${fromName} não tem tarefas ${everywhere ? "" : "nesses ambientes "}para passar.`
            ) : (
              <>
                <span className="inline-flex items-center gap-1.5 font-extrabold">
                  {fromName} <ArrowRight className="size-4" /> {toName}
                </span>
                <br />
                {plural(fixedCount, "tarefa fixa", "tarefas fixas")}
                {rotationCount > 0 && ` + ${plural(rotationCount, "rodízio", "rodízios")}`}.
                {joining > 0 && ` ${toName} passa a participar de ${plural(joining, "ambiente", "ambientes")}.`}
              </>
            )}
          </div>

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}

          <div className="space-y-2.5">
            <button
              type="button"
              disabled={!canRun}
              onClick={() => run("move")}
              className="press flex h-[52px] w-full items-center justify-center rounded-[15px] bg-primary text-[15px] font-bold text-white shadow-[0_8px_18px_-7px_rgba(74,124,89,.5)] disabled:opacity-40 disabled:shadow-none"
            >
              {busy ? "Passando…" : `Passar tudo para ${toName === "—" ? "…" : toName}`}
            </button>
            <button
              type="button"
              disabled={!canRun || from === NONE}
              onClick={() => run("split")}
              className="press flex h-[50px] w-full items-center justify-center rounded-[15px] border-[1.5px] border-strong text-[15px] font-bold disabled:opacity-40"
            >
              Dividir entre {fromName === "—" ? "…" : fromName} e {toName === "—" ? "…" : toName}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
