"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { firstEmoji, spaceEmoji, spaceTint } from "@/lib/space-icon";

const SUGGESTIONS = [
  "🏠", "🍳", "🛋️", "🛏️", "🚿", "🌿", "🚗", "🧺",
  "💼", "📚", "🎓", "💪", "🏃", "🛒", "💰", "✈️",
  "🐶", "🐱", "🎮", "🎨", "🎵", "🔧", "🍽️", "🎉",
];

/**
 * Qualquer emoji do teclado do aparelho: toque no quadrado e use o teclado de emojis.
 * Sugestões rápidas embaixo. O valor vai num <input hidden name=...>.
 */
export function EmojiField({ name, defaultValue }: { name: string; defaultValue?: string | null }) {
  const [value, setValue] = useState(spaceEmoji(defaultValue));
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={value} />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => input.current?.focus()}
          aria-label="Escolher outro emoji"
          className="press flex size-16 shrink-0 items-center justify-center rounded-[18px] text-4xl"
          style={{ backgroundColor: `color-mix(in oklab, ${spaceTint(value)} var(--tint-strength), var(--card))` }}
        >
          {value}
        </button>
        <div className="min-w-0 flex-1">
          <input
            ref={input}
            value=""
            onChange={(e) => {
              const emoji = firstEmoji(e.target.value);
              if (emoji) setValue(emoji);
            }}
            inputMode="text"
            autoComplete="off"
            autoCorrect="off"
            placeholder="Toque e use o teclado de emojis 😀"
            aria-label="Digite ou cole um emoji"
            className="w-full rounded-[13px] bg-card px-3.5 py-3 text-[15px] outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>
      <div className="grid grid-cols-8 gap-1.5">
        {SUGGESTIONS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setValue(e)}
            aria-label={`Usar ${e}`}
            className={cn(
              "press flex aspect-square items-center justify-center rounded-[11px] bg-card text-xl",
              value === e && "ring-2 ring-primary",
            )}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
