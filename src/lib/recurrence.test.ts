import { describe, expect, it } from "vitest";
import { dueDatesInRange, isDueOn, type RecurrenceConfig } from "./recurrence";

describe("isDueOn", () => {
  it("daily: vence todo dia a partir do start", () => {
    const c: RecurrenceConfig = { type: "daily", startDate: "2026-06-20" };
    expect(isDueOn(c, "2026-06-20")).toBe(true);
    expect(isDueOn(c, "2026-06-25")).toBe(true);
  });

  it("não vence antes do startDate", () => {
    const c: RecurrenceConfig = { type: "daily", startDate: "2026-06-20" };
    expect(isDueOn(c, "2026-06-19")).toBe(false);
  });

  it("weekly: vence só nos dias configurados (quinta = 4)", () => {
    const c: RecurrenceConfig = {
      type: "weekly",
      startDate: "2026-06-01",
      days: [4],
    };
    expect(isDueOn(c, "2026-06-18")).toBe(true); // quinta
    expect(isDueOn(c, "2026-06-19")).toBe(false); // sexta
    expect(isDueOn(c, "2026-06-25")).toBe(true); // quinta seguinte
  });

  it("custom: vence a cada X dias a partir do start", () => {
    const c: RecurrenceConfig = {
      type: "custom",
      startDate: "2026-06-20",
      intervalDays: 15,
    };
    expect(isDueOn(c, "2026-06-20")).toBe(true);
    expect(isDueOn(c, "2026-07-05")).toBe(true); // +15
    expect(isDueOn(c, "2026-07-04")).toBe(false);
  });

  it("custom: intervalo inválido nunca vence", () => {
    const c: RecurrenceConfig = {
      type: "custom",
      startDate: "2026-06-20",
      intervalDays: 0,
    };
    expect(isDueOn(c, "2026-06-20")).toBe(false);
  });
});

describe("dueDatesInRange", () => {
  it("weekly atravessando virada de mês", () => {
    const c: RecurrenceConfig = {
      type: "weekly",
      startDate: "2026-06-01",
      days: [4], // quintas
    };
    const dates = dueDatesInRange(c, "2026-06-25", "2026-07-09");
    expect(dates).toEqual(["2026-06-25", "2026-07-02", "2026-07-09"]);
  });

  it("range invertido retorna vazio", () => {
    const c: RecurrenceConfig = { type: "daily", startDate: "2026-06-01" };
    expect(dueDatesInRange(c, "2026-06-10", "2026-06-05")).toEqual([]);
  });

  it("daily de 7 dias gera 7 datas", () => {
    const c: RecurrenceConfig = { type: "daily", startDate: "2026-06-01" };
    expect(dueDatesInRange(c, "2026-06-20", "2026-06-26")).toHaveLength(7);
  });
});
