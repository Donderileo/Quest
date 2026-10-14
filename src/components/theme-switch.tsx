"use client";

import { useEffect, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

type Pref = "system" | "light" | "dark";
const OPTIONS: { value: Pref; label: string }[] = [
  { value: "system", label: "Automático" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
];

function apply(pref: Pref) {
  const dark =
    pref === "dark" ||
    (pref === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => void listeners.delete(cb);
};
function read(): Pref {
  try {
    return (localStorage.getItem("tend-theme") as Pref | null) ?? "system";
  } catch {
    return "system";
  }
}

export function ThemeSwitch() {
  const pref = useSyncExternalStore(subscribe, read, () => "system" as Pref);

  // "Automático" acompanha o sistema em tempo real
  useEffect(() => {
    if (pref !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const on = () => apply("system");
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [pref]);

  function choose(next: Pref) {
    try {
      localStorage.setItem("tend-theme", next);
    } catch {}
    apply(next);
    listeners.forEach((l) => l());
  }

  return (
    <section className="space-y-2">
      <h2 className="text-xs font-bold uppercase tracking-wide text-subtle">Aparência</h2>
      <div role="radiogroup" aria-label="Aparência" className="flex gap-1 rounded-[13px] bg-track p-1">
        {OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={pref === value}
            onClick={() => choose(value)}
            className={cn(
              "press flex-1 rounded-[10px] py-2 text-[13.5px] font-semibold transition-colors",
              pref === value
                ? "bg-card text-foreground shadow-[0_1px_3px_rgba(0,0,0,.12)]"
                : "text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}
