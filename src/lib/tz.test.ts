import { describe, expect, it } from "vitest";
import { addDaysISO, isoInTz, startOfDayInstant, todayISO, weekStartISO } from "./tz";

describe("tz (America/Sao_Paulo)", () => {
  it("22h em Brasília ainda é o mesmo dia (UTC já virou)", () => {
    // 2026-10-18 22:00 BRT = 2026-10-19 01:00 UTC
    expect(todayISO(new Date("2026-10-19T01:00:00Z"))).toBe("2026-10-18");
  });

  it("00:30 em Brasília já é o dia seguinte", () => {
    expect(todayISO(new Date("2026-10-19T03:30:00Z"))).toBe("2026-10-19");
  });

  it("isoInTz aceita string ISO de timestamp", () => {
    expect(isoInTz("2026-10-19T02:59:00Z")).toBe("2026-10-18");
  });

  it("addDaysISO atravessa mês e ano", () => {
    expect(addDaysISO("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDaysISO("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("weekStartISO devolve a segunda", () => {
    expect(weekStartISO("2026-10-18")).toBe("2026-10-12"); // domingo
    expect(weekStartISO("2026-10-12")).toBe("2026-10-12"); // segunda
    expect(weekStartISO("2026-10-14")).toBe("2026-10-12"); // quarta
  });

  it("startOfDayInstant: meia-noite local = 03:00 UTC", () => {
    expect(startOfDayInstant("2026-10-12").toISOString()).toBe("2026-10-12T03:00:00.000Z");
  });
});
