"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, LayoutGrid, List } from "lucide-react";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useLocalPref } from "@/lib/use-local-pref";
import { spaceEmoji, spaceTint } from "@/lib/space-icon";
import { addDaysISO } from "@/lib/tz";
import { Avatar } from "@/components/ui/avatar";
import { CheckButton } from "@/components/check-button";

export type BoardOccurrence = {
  id: string;
  taskId: string;
  date: string;
  done: boolean;
  assignedTo: string | null;
  assignee: { name: string; avatar_url: string | null } | null;
  title: string;
  points: number;
  gamified: boolean;
  spaceId: string;
  spaceName: string;
  spaceIcon: string | null;
};

const SCOPES = ["mine", "all"] as const;
const VIEWS = ["list", "grouped"] as const;
const GROUP_PREVIEW = 3;

const weekday = (iso: string) => format(parseISO(iso), "EEE", { locale: ptBR }).replace(".", "");

/** página especial: pendências de dias anteriores, numa seção só */
const OVERDUE = "overdue";

function lateLabel(date: string, today: string) {
  const n = differenceInCalendarDays(parseISO(today), parseISO(date));
  return n <= 1 ? "Ontem" : `há ${n} dias`;
}

function dayTitle(iso: string, today: string) {
  const long = format(parseISO(iso), "EEEE, d 'de' MMM", { locale: ptBR });
  if (iso === today) return `Hoje · ${long}`;
  if (iso === addDaysISO(today, 1)) return `Amanhã · ${long}`;
  return long.charAt(0).toUpperCase() + long.slice(1);
}

/** pendentes primeiro, concluídas no fim (continuam visíveis: o dia nunca "some") */
const byStatus = (a: BoardOccurrence, b: BoardOccurrence) => Number(a.done) - Number(b.done);

function Row({
  occ,
  showSpace,
  showAssignee,
  flat,
  late,
}: {
  occ: BoardOccurrence;
  showSpace: boolean;
  showAssignee: boolean;
  flat?: boolean;
  late?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3",
        flat ? "px-4 py-3" : "rounded-[15px] bg-card p-[14px] shadow-[0_2px_7px_-3px_rgba(40,45,40,.07)]",
      )}
    >
      <CheckButton occurrenceId={occ.id} done={occ.done} title={occ.title} />
      <Link
        href={`/tasks/${occ.taskId}/edit`}
        aria-label={`Editar tarefa: ${occ.title}`}
        className="min-w-0 flex-1"
      >
        <p className={cn("truncate font-bold tracking-tight", occ.done && "text-faint line-through")}>{occ.title}</p>
        {(showSpace || late) && (
          <div className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            {showSpace && (
              <>
                <span>{spaceEmoji(occ.spaceIcon)}</span>
                <span className="truncate">{occ.spaceName}</span>
              </>
            )}
            {showSpace && late && <span aria-hidden>·</span>}
            {late && <span className="shrink-0 text-destructive">{late}</span>}
          </div>
        )}
      </Link>
      {occ.gamified && occ.points > 0 && !occ.done && (
        <span className="shrink-0 text-xs font-bold text-gold">+{occ.points}</span>
      )}
      {showAssignee && occ.assignee && (
        <Avatar
          name={occ.assignee.name}
          src={occ.assignee.avatar_url}
          size="sm"
          className={cn("size-[26px] text-[11px]", occ.done && "opacity-50")}
        />
      )}
    </div>
  );
}

function GroupCard({
  date,
  today,
  items,
  showAssignee,
}: {
  date: string;
  today: string;
  items: BoardOccurrence[];
  showAssignee: boolean;
}) {
  const [open, setOpen] = useState(false);
  const first = items[0];
  const done = items.filter((i) => i.done).length;
  const visible = open ? items : items.slice(0, GROUP_PREVIEW);
  const rest = items.length - GROUP_PREVIEW;

  return (
    <section
      aria-label={`${first.spaceName}, ${date}`}
      className="overflow-hidden rounded-[18px] bg-card shadow-[0_2px_8px_-3px_rgba(40,45,40,.08)]"
    >
      <header className="flex items-center gap-2.5 bg-muted px-4 py-2.5">
        <span
          className="flex size-7 items-center justify-center rounded-lg text-base"
          style={{ backgroundColor: `color-mix(in oklab, ${spaceTint(first.spaceIcon)} var(--tint-strength), var(--card))` }}
        >
          {spaceEmoji(first.spaceIcon)}
        </span>
        <h3 className="min-w-0 flex-1 truncate text-[15px] font-extrabold">{first.spaceName}</h3>
        <span className="text-xs font-bold text-muted-foreground">
          {done}/{items.length}
        </span>
      </header>
      <div className="divide-y divide-border">
        {visible.map((occ) => (
          <Row
            key={occ.id}
            occ={occ}
            showSpace={false}
            showAssignee={showAssignee}
            flat
            late={date === OVERDUE ? lateLabel(occ.date, today) : undefined}
          />
        ))}
      </div>
      {rest > 0 && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="press flex w-full items-center justify-center gap-1.5 bg-muted py-2.5 text-[13px] font-bold text-muted-foreground"
        >
          {open ? (
            <>
              Mostrar menos <ChevronUp className="size-4" />
            </>
          ) : (
            <>
              Mostrar mais {rest} <ChevronDown className="size-4" />
            </>
          )}
        </button>
      )}
    </section>
  );
}

function DayPage({
  date,
  today,
  items,
  view,
  showAssignee,
}: {
  date: string;
  today: string;
  items: BoardOccurrence[];
  view: (typeof VIEWS)[number];
  showAssignee: boolean;
}) {
  const overdue = date === OVERDUE;
  // atrasadas: mais antigas primeiro; dias normais: pendentes antes das concluídas
  const sorted = useMemo(
    () =>
      [...items].sort(overdue ? (a, b) => a.date.localeCompare(b.date) || byStatus(a, b) : byStatus),
    [items, overdue],
  );
  const done = items.filter((i) => i.done).length;
  const allDone = !overdue && items.length > 0 && done === items.length;

  const groups = useMemo(() => {
    const map = new Map<string, BoardOccurrence[]>();
    for (const o of sorted) {
      if (!map.has(o.spaceId)) map.set(o.spaceId, []);
      map.get(o.spaceId)!.push(o);
    }
    return [...map.values()];
  }, [sorted]);

  return (
    <div
      className="min-w-full snap-start space-y-3 px-[22px] pb-6"
      role="group"
      aria-label={overdue ? "Atrasadas" : dayTitle(date, today)}
    >
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[15px] font-extrabold">{overdue ? "Atrasadas" : dayTitle(date, today)}</h2>
          {items.length > 0 && (
            <span className="shrink-0 text-xs font-bold text-muted-foreground">
              {overdue ? `${items.length - done} pendente${items.length - done === 1 ? "" : "s"}` : `${done} de ${items.length}`}
            </span>
          )}
        </div>
        {overdue && items.length > 0 && (
          <p className="text-[13px] text-muted-foreground">Ficaram para trás. Conclua agora para zerar a lista.</p>
        )}
        {!overdue && items.length > 0 && (
          <div className="h-1.5 overflow-hidden rounded-full bg-track" aria-hidden>
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${(done / items.length) * 100}%` }}
            />
          </div>
        )}
        {allDone && <p className="text-sm font-semibold text-primary">Tudo feito por {date === today ? "hoje" : "este dia"} 🎉</p>}
      </div>

      {items.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {overdue ? "Nada atrasado 🎉" : date === today ? "Nada para hoje." : "Nada para este dia."}
        </p>
      ) : view === "list" ? (
        <div className="space-y-[9px]">
          {sorted.map((o) => (
            <Row
              key={o.id}
              occ={o}
              showSpace
              showAssignee={showAssignee}
              late={overdue ? lateLabel(o.date, today) : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <GroupCard key={g[0].spaceId} date={date} today={today} items={g} showAssignee={showAssignee} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Tela inicial: tarefas do dia, com os próximos dias ao deslizar para o lado.
 * Hoje fica sempre visível (concluídas vão para o fim, nunca somem).
 * Visões: lista normal ou agrupada por ambiente (cards com "Mostrar mais").
 */
export function TasksBoard({
  occurrences,
  meId,
  today,
  days,
}: {
  occurrences: BoardOccurrence[];
  meId: string;
  today: string;
  days: string[];
}) {
  const [scope, setScope] = useLocalPref("tend-tasks-scope", "mine", SCOPES);
  const [view, setView] = useLocalPref("tend-tasks-view", "list", VIEWS);
  const pager = useRef<HTMLDivElement>(null);
  const chips = useRef<(HTMLButtonElement | null)[]>([]);
  // páginas: [Atrasadas] [Hoje] [Amanhã] … — o app abre em Hoje (índice 1); voltar mostra as atrasadas
  const pages = useMemo(() => [OVERDUE, ...days], [days]);
  const [active, setActive] = useState(1);
  // false no servidor/hidratação, true depois: esconde o pager até posicionar em Hoje
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const visible = useMemo(
    () => (scope === "all" ? occurrences : occurrences.filter((o) => o.assignedTo === meId || o.assignedTo === null)),
    [occurrences, scope, meId],
  );
  const byDay = useMemo(() => {
    const map = new Map<string, BoardOccurrence[]>(pages.map((d) => [d, []]));
    for (const o of visible) map.get(o.date < today ? OVERDUE : o.date)?.push(o);
    return map;
  }, [visible, pages, today]);

  // posiciona em Hoje antes da primeira pintura (sem piscar a página de atrasadas)
  useLayoutEffect(() => {
    const el = pager.current;
    if (hydrated && el) el.scrollLeft = el.clientWidth;
  }, [hydrated]);

  // sincroniza a faixa de dias com a rolagem lateral
  useEffect(() => {
    const el = pager.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const i = Math.round(el.scrollLeft / Math.max(el.clientWidth, 1));
        setActive((prev) => (prev === i ? prev : i));
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    chips.current[active]?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [active]);

  function goTo(i: number) {
    const el = pager.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: i * el.clientWidth, behavior: reduce ? "auto" : "smooth" });
  }

  const showAssignee = scope === "all";

  return (
    <div className="space-y-4 py-5">
      <div className="flex items-center justify-between gap-3 px-[22px]">
        <h1 className="text-2xl font-extrabold tracking-tight">Tarefas</h1>
        <button
          type="button"
          onClick={() => setView(view === "list" ? "grouped" : "list")}
          aria-label={view === "list" ? "Agrupar por ambiente" : "Ver em lista"}
          title={view === "list" ? "Agrupar por ambiente" : "Ver em lista"}
          className="press flex size-10 items-center justify-center rounded-xl bg-card shadow-[0_2px_6px_-2px_rgba(0,0,0,.12)]"
        >
          {view === "list" ? <LayoutGrid className="size-5" /> : <List className="size-5" />}
        </button>
      </div>

      <div className="px-[22px]">
        <div role="radiogroup" aria-label="Quais tarefas" className="flex gap-1 rounded-[13px] bg-track p-1">
          {([
            { v: "mine", label: "Minhas" },
            { v: "all", label: "Da casa" },
          ] as const).map(({ v, label }) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={scope === v}
              onClick={() => setScope(v)}
              className={cn(
                "press flex-1 rounded-[10px] py-2 text-[13.5px] font-semibold transition-colors",
                scope === v ? "bg-card text-foreground shadow-[0_1px_3px_rgba(0,0,0,.12)]" : "text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* faixa de dias */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-[22px]" role="tablist" aria-label="Dias">
        {pages.map((d, i) => {
          const list = byDay.get(d) ?? [];
          const pending = list.filter((o) => !o.done).length;
          const isActive = active === i;
          const isOverdue = d === OVERDUE;
          return (
            <button
              key={d}
              ref={(el) => {
                chips.current[i] = el;
              }}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => goTo(i)}
              className={cn(
                "press flex min-w-[54px] shrink-0 flex-col items-center gap-0.5 rounded-[14px] px-3 py-2 transition-colors",
                isActive ? "bg-primary text-white" : "bg-card text-foreground shadow-[0_2px_6px_-3px_rgba(40,45,40,.1)]",
              )}
            >
              <span className={cn("text-[11px] font-bold uppercase", isActive ? "text-white/90" : "text-subtle")}>
                {isOverdue ? "Atrasadas" : i === 1 ? "Hoje" : weekday(d)}
              </span>
              <span
                className={cn(
                  "text-[17px] font-extrabold leading-none",
                  isOverdue && !isActive && pending > 0 && "text-destructive",
                  isOverdue && pending === 0 && !isActive && "text-faint",
                )}
              >
                {isOverdue ? pending : format(parseISO(d), "d")}
              </span>
              <span
                className={cn(
                  "mt-0.5 h-1.5 w-1.5 rounded-full",
                  !isOverdue && pending > 0 ? (isActive ? "bg-white" : "bg-primary") : "bg-transparent",
                )}
                aria-label={!isOverdue && pending > 0 ? `${pending} pendentes` : undefined}
              />
            </button>
          );
        })}
      </div>

      {/* páginas dos dias: rolagem lateral com encaixe */}
      <div
        ref={pager}
        className={cn("no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain", !hydrated && "invisible")}
        style={{ scrollbarWidth: "none" }}
      >
        {pages.map((d) => (
          <DayPage
            key={d}
            date={d}
            today={today}
            items={byDay.get(d) ?? []}
            view={view}
            showAssignee={showAssignee}
          />
        ))}
      </div>
    </div>
  );
}
