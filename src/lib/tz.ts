/**
 * Datas "de calendário" sempre no fuso do app, nunca no do servidor (UTC na Vercel).
 * Sem isso, entre 21h e 00h em Brasília o servidor já está no dia seguinte e
 * "hoje" / ocorrências / semana saem errados.
 */
export const APP_TZ = process.env.APP_TIMEZONE || "America/Sao_Paulo";

const dayFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** yyyy-MM-dd de um instante, no fuso do app. */
export function isoInTz(date: Date | string): string {
  return dayFmt.format(typeof date === "string" ? new Date(date) : date);
}

export const todayISO = (now: Date = new Date()) => isoInTz(now);

/** Soma dias a uma data yyyy-MM-dd (aritmética de calendário, imune a DST). */
export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Segunda-feira da semana de `iso`. */
export function weekStartISO(iso: string): string {
  const dow = new Date(`${iso}T00:00:00Z`).getUTCDay(); // 0=dom
  return addDaysISO(iso, -((dow + 6) % 7));
}

/** Instante UTC em que `iso` começa (00:00) no fuso do app. */
export function startOfDayInstant(iso: string): Date {
  const guess = new Date(`${iso}T00:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(guess);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const localAsUTC = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return new Date(guess.getTime() - (localAsUTC - guess.getTime()));
}
