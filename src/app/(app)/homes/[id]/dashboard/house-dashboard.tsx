"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { cn } from "@/lib/utils";

export type PersonStats = {
  name: string;
  avatar_url: string | null;
  today: number;
  week: number;
  all: number;
  points: number;
};

type Period = "today" | "week" | "all";

export function HouseDashboard({
  homeId,
  homeName,
  people,
  totalToday,
  totalWeek,
}: {
  homeId: string;
  homeName: string;
  people: PersonStats[];
  totalToday: number;
  totalWeek: number;
}) {
  const [period, setPeriod] = useState<Period>("today");

  const ranked = [...people].sort((a, b) => b[period] - a[period]);
  const maxVal = Math.max(1, ...ranked.map((p) => p[period]));
  const totalAll = people.reduce((s, p) => s + p.all, 0);
  const totalForPeriod = period === "today" ? totalToday : period === "week" ? totalWeek : totalAll;

  const periodLabel = period === "today" ? "hoje" : period === "week" ? "esta semana" : "no total";

  return (
    <div className="px-[22px] py-4">
      <RealtimeRefresh tables={["task_occurrences"]} />
      {/* header */}
      <div className="flex items-center justify-between">
        <Link
          href={`/homes/${homeId}`}
          className="flex size-10 items-center justify-center rounded-xl bg-card shadow-[0_2px_6px_-2px_rgba(0,0,0,.12)]"
          aria-label="Voltar"
        >
          <ChevronRight className="size-5 rotate-180" />
        </Link>
        <span className="text-[17px] font-extrabold tracking-tight">Métricas</span>
        <span className="size-10" />
      </div>
      <p className="mt-2 text-[13px] font-semibold text-muted-foreground">{homeName}</p>

      {/* toggle */}
      <div className="mt-4 flex gap-1 rounded-xl bg-[#eae8e1] p-1">
        {([
          { v: "today", label: "Hoje" },
          { v: "week", label: "Esta semana" },
          { v: "all", label: "Sempre" },
        ] as const).map(({ v, label }) => (
          <button
            key={v}
            type="button"
            onClick={() => setPeriod(v)}
            className={cn(
              "flex-1 rounded-[9px] py-2 text-[13px] font-semibold transition-colors",
              period === v ? "bg-card text-foreground shadow-[0_1px_3px_rgba(0,0,0,.08)]" : "text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* resumo */}
      <div className="mt-4 flex items-center justify-between rounded-[18px] bg-primary p-5 text-white shadow-[0_10px_24px_-10px_rgba(74,124,89,.55)]">
        <div>
          <div className="text-[13px] font-semibold text-white/80">Tarefas concluídas {periodLabel}</div>
          <div className="mt-0.5 text-[26px] font-extrabold tracking-tight">{totalForPeriod}</div>
        </div>
      </div>

      {/* ranking por pessoa */}
      <div className="mb-3 mt-6 text-xs font-bold uppercase tracking-wide text-[#9aa09b]">Por pessoa</div>
      <div className="space-y-[9px]">
        {ranked.map((p, i) => {
          const val = p[period];
          return (
            <div key={i} className="rounded-[15px] bg-card p-[14px] shadow-[0_2px_7px_-3px_rgba(40,45,40,.07)]">
              <div className="flex items-center gap-3">
                <span className={cn("w-5 text-center text-[15px] font-extrabold", i === 0 && val > 0 ? "text-primary" : "text-[#9aa09b]")}>
                  {i + 1}
                </span>
                <Avatar name={p.name} src={p.avatar_url} size="md" className="size-[34px] text-[13px]" />
                <span className="flex-1 text-[15.5px] font-bold">{p.name}</span>
                <span className="text-[15px] font-extrabold">{val}</span>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${(val / maxVal) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
