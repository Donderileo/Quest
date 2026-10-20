/**
 * Ícone de ambiente = qualquer emoji (guardado direto em spaces.icon).
 * As chaves antigas (kitchen, garden…) ainda são entendidas, para dados legados.
 */
const LEGACY: Record<string, string> = {
  kitchen: "🍳",
  bathroom: "🚿",
  living: "🛋️",
  bedroom: "🛏️",
  garden: "🌿",
  garage: "🚗",
};

export const DEFAULT_EMOJI = "🏠";

// pastéis para o quadradinho do ícone e cores sólidas para as bolinhas; escolhidos pelo emoji
const TINTS = ["#f3e7df", "#e2e9f1", "#efe7f3", "#f1ece2", "#e6efe7", "#e8eae6", "#f3e2e6", "#e4eef0"];
const DOTS = ["#c07a4f", "#6d7fa8", "#a87faa", "#c0913f", "#4a7c59", "#7d847e", "#c06b7d", "#4f7d8c"];

function hash(s: string) {
  let h = 0;
  for (const ch of s) h = (h * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  return h;
}

export function spaceEmoji(icon?: string | null): string {
  if (!icon) return DEFAULT_EMOJI;
  return LEGACY[icon] ?? icon;
}
export const spaceTint = (icon?: string | null) => TINTS[hash(spaceEmoji(icon)) % TINTS.length];
export const spaceDot = (icon?: string | null) => DOTS[hash(spaceEmoji(icon)) % DOTS.length];

const PICTO = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u;
const segmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

/** Primeiro emoji (grafema) do texto, ou null. Usado no cliente e para validar no servidor. */
export function firstEmoji(input?: string | null): string | null {
  const text = (input ?? "").trim();
  if (!text) return null;
  const graphemes = segmenter ? [...segmenter.segment(text)].map((s) => s.segment) : Array.from(text);
  return graphemes.find((g) => PICTO.test(g)) ?? null;
}
