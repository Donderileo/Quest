"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Home = { id: string; name: string };

export function HomeSwitcher({ current, homes }: { current: Home; homes: Home[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // só uma casa: não há o que trocar, mostra o nome estático
  const switchable = homes.length > 1;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => switchable && setOpen((v) => !v)}
        className="flex items-center gap-1.5"
        aria-label={switchable ? "Trocar de casa" : undefined}
      >
        <h1 className="text-[25px] font-extrabold leading-none tracking-tight">{current.name}</h1>
        {switchable && <ChevronDown className={cn("size-5 text-muted-foreground transition-transform", open && "rotate-180")} />}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-2xl bg-card shadow-[0_12px_30px_-8px_rgba(40,45,40,.28)] ring-1 ring-black/5">
          {homes.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => {
                setOpen(false);
                if (h.id !== current.id) router.push(`/homes/${h.id}`);
              }}
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-[15px] font-semibold active:bg-muted"
            >
              <span className="flex-1 truncate">{h.name}</span>
              {h.id === current.id && <Check className="size-4 text-primary" strokeWidth={2.6} />}
            </button>
          ))}
          <div className="h-px bg-[#f0efe9]" />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              router.push("/homes/new");
            }}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-[15px] font-bold text-primary active:bg-muted"
          >
            <Plus className="size-4" strokeWidth={2.6} />
            Nova casa
          </button>
        </div>
      )}
    </div>
  );
}
