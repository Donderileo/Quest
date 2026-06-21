import {
  differenceInCalendarDays,
  eachDayOfInterval,
  format,
  getDay,
  isBefore,
  parseISO,
} from "date-fns";

export type RecurrenceType = "daily" | "weekly" | "custom";

export interface RecurrenceConfig {
  type: RecurrenceType;
  /** yyyy-MM-dd — primeira data possível da tarefa */
  startDate: string;
  /** dias da semana 0=domingo..6=sábado (apenas weekly) */
  days?: number[];
  /** intervalo em dias a partir de startDate (apenas custom) */
  intervalDays?: number;
}

const ISO = "yyyy-MM-dd";

/** A tarefa vence nesta data? `date` é yyyy-MM-dd. */
export function isDueOn(config: RecurrenceConfig, date: string): boolean {
  const target = parseISO(date);
  const start = parseISO(config.startDate);

  if (isBefore(target, start)) return false;

  switch (config.type) {
    case "daily":
      return true;
    case "weekly":
      return (config.days ?? []).includes(getDay(target));
    case "custom": {
      const interval = config.intervalDays ?? 0;
      if (interval <= 0) return false;
      return differenceInCalendarDays(target, start) % interval === 0;
    }
  }
}

/**
 * Datas (yyyy-MM-dd) em que a tarefa vence dentro do intervalo [from, to],
 * inclusivo. Usado pelo job de geração de ocorrências.
 */
export function dueDatesInRange(
  config: RecurrenceConfig,
  from: string,
  to: string,
): string[] {
  const fromDate = parseISO(from);
  const toDate = parseISO(to);
  if (isBefore(toDate, fromDate)) return [];

  return eachDayOfInterval({ start: fromDate, end: toDate })
    .map((d) => format(d, ISO))
    .filter((d) => isDueOn(config, d));
}
