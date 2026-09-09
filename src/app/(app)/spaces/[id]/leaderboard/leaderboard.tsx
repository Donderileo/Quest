"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Trophy } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { cn } from "@/lib/utils";

const SPACE_ICONS: Record<string, string> = {
  kitchen: "🍳", bathroom: "🚿", living: "🛋️",
  bedroom: "🛏️", garden: "🌿", garage: "🚗",
};

export type RankEntry = { name: string; avatar_url: string | null; points: number };
export type Activity = { name: string; avatar_url: string | null; title: string; points: number };

export function Leaderboard({
  spaceId,
  spaceName,
  homeName,
  icon,
  weekly,
  allTime,
  activity,
}: {
  spaceId: string;
  spaceName: string;
  homeName: string | null;
  icon: string | null;
  weekly: RankEntry[];
  allTime: RankEntry[];
  activity: Activity[];
}) {
  const [period, setPeriod] = useState<"week" | "all">("week");
  const rank = period === "week" ? weekly : allTime;
  const leader = rank[0];
  const gap = rank.length > 1 ? rank[0].points - rank[1].points : 0;

  return (
    <div className="px-[22px] py-4">
      <RealtimeRefresh tables={["task_occurrences", "space_member_points"]} />
      {/* header */}
      <div className="flex items-center justify-between">
        <Link
          href={`/spaces/${spaceId}`}
          className="flex size-10 items-center justify-center rounded-xl bg-card shadow-[0_2px_6px_-2px_rgba(0,0,0,.12)]"
          aria-label="Voltar"
        >
          <ChevronRight className="size-5 rotate-180" />
        </Link>
        <div className="text-center">
          {homeName && (
            <div className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">{homeName}</div>
          )}
          <div className="flex items-center justify-center gap-1.5 text-[17px] font-extrabold tracking-tight">
            <span className="text-lg">{SPACE_ICONS[icon ?? ""] ?? "🏠"}</span>
            {spaceName}
          </div>
        </div>
        <span className="size-10" />
      </div>

      {/* toggle */}
      <div className="mt-4 flex gap-1 rounded-xl bg-[#eae8e1] p-1">
        {([
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

      {/* card do líder */}
      {leader && leader.points > 0 ? (
        <div className="relative mt-5 flex items-center gap-4 overflow-hidden rounded-[22px] bg-primary p-[22px] shadow-[0_14px_30px_-12px_rgba(74,124,89,.6)]">
          <div className="absolute -right-8 -top-8 size-28 rounded-full bg-white/[0.07]" />
          <Avatar name={leader.name} src={leader.avatar_url} size="lg" className="size-[60px] bg-white !text-primary text-2xl" />
          <div className="flex-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-white/80">
              <Trophy className="size-3.5" /> Liderando
            </div>
            <div className="text-[22px] font-extrabold tracking-tight text-white">{leader.name}</div>
            {gap > 0 && <div className="text-[13px] font-semibold text-white/80">À frente por {gap} pontos</div>}
          </div>
          <div className="text-right">
            <div className="text-3xl font-extrabold leading-none tracking-tight text-white">{leader.points}</div>
            <div className="text-xs font-semibold text-white/80">pontos</div>
          </div>
        </div>
      ) : (
        <p className="mt-5 rounded-[18px] bg-card p-6 text-center text-sm text-muted-foreground shadow-[0_2px_7px_-3px_rgba(40,45,40,.07)]">
          {period === "week" ? "Ninguém pontuou esta semana ainda." : "Ainda não há pontos por aqui."}
        </p>
      )}

      {/* ranking */}
      {rank.length > 0 && (
        <div className="mt-4 space-y-[9px]">
          {rank.map((r, i) => (
            <div key={i} className="flex items-center gap-3 rounded-[15px] bg-card p-[13px] shadow-[0_2px_7px_-3px_rgba(40,45,40,.07)]">
              <span className={cn("w-[22px] text-center text-[15px] font-extrabold", i === 0 ? "text-primary" : "text-[#9aa09b]")}>
                {i + 1}
              </span>
              <Avatar name={r.name} src={r.avatar_url} size="md" className="size-[34px] text-[13px]" />
              <span className="flex-1 text-[15.5px] font-bold">{r.name}</span>
              <span className="text-[15px] font-extrabold">{r.points}</span>
            </div>
          ))}
        </div>
      )}

      {/* atividade recente */}
      {activity.length > 0 && (
        <>
          <div className="mb-3 mt-6 text-xs font-bold uppercase tracking-wide text-[#9aa09b]">Recente</div>
          <div className="space-y-3">
            {activity.map((a, i) => (
              <div key={i} className="flex items-center gap-3">
                <Avatar name={a.name} src={a.avatar_url} size="sm" className="size-[30px] text-xs" />
                <span className="flex-1 text-sm font-medium text-[#4b504b]">
                  <span className="font-bold text-foreground">{a.name}</span> concluiu {a.title}
                </span>
                {a.points > 0 && <span className="text-[13.5px] font-extrabold text-primary">+{a.points}</span>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
