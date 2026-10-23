import { describe, expect, it } from "vitest";
import { applyPlan, balance, weightOf, type BalanceInput, type BalanceOcc } from "./balance";

const P = ["a", "b", "c"];

function occ(id: string, taskId: string, date: string, assignee: string | null, candidates = P, weight = 1): BalanceOcc {
  return { id, taskId, date, weight, candidates, assignee };
}

/** o defeito: 6 rodízios do mesmo dia, todos na mesma pessoa */
function sameDay(n = 6): BalanceOcc[] {
  return Array.from({ length: n }, (_, i) => occ(`o${i}`, `t${i}`, "2026-10-23", "a"));
}

const count = (occs: BalanceOcc[], who: string, date?: string) =>
  occs.filter((o) => o.assignee === who && (!date || o.date === date)).length;

describe("balance — cenário do problema", () => {
  it("6 tarefas no mesmo dia todas da mesma pessoa → 2 para cada", () => {
    const movable = sameDay();
    const plan = balance({ movable, fixed: [], people: P, mode: "daily" });
    const after = applyPlan(movable, plan.changes);
    expect([count(after, "a"), count(after, "b"), count(after, "c")]).toEqual([2, 2, 2]);
    expect(plan.spreadBefore).toBe(6);
    expect(plan.spreadAfter).toBe(0);
    expect(plan.changes).toHaveLength(4);
  });

  it("é idempotente: aplicar e rodar de novo não muda nada", () => {
    const movable = sameDay();
    const first = balance({ movable, fixed: [], people: P, mode: "daily" });
    const again = balance({ movable: applyPlan(movable, first.changes), fixed: [], people: P, mode: "daily" });
    expect(again.changes).toEqual([]);
  });

  it("é determinístico", () => {
    const input: BalanceInput = { movable: sameDay(), fixed: [], people: P, mode: "daily" };
    expect(balance(input)).toEqual(balance(input));
  });

  it("já balanceado → nenhuma mudança", () => {
    const movable = [occ("1", "t1", "2026-10-23", "a"), occ("2", "t2", "2026-10-23", "b"), occ("3", "t3", "2026-10-23", "c")];
    expect(balance({ movable, fixed: [], people: P, mode: "daily" }).changes).toEqual([]);
  });

  it("entrada vazia", () => {
    const plan = balance({ movable: [], fixed: [], people: P, mode: "daily" });
    expect(plan.changes).toEqual([]);
    expect(plan.spreadAfter).toBe(0);
  });
});

describe("balance — carga fixa e restrições", () => {
  it("tarefas fixas e concluídas contam como carga e não mudam", () => {
    // a já tem 2 fixas no dia: os dois rodízios vão para b e c
    const movable = [occ("1", "t1", "2026-10-23", "a"), occ("2", "t2", "2026-10-23", "a")];
    const fixed = [
      { date: "2026-10-23", userId: "a", weight: 1 },
      { date: "2026-10-23", userId: "a", weight: 1 },
    ];
    const after = applyPlan(movable, balance({ movable, fixed, people: P, mode: "daily" }).changes);
    expect(count(after, "a")).toBe(0);
    expect(count(after, "b") + count(after, "c")).toBe(2);
  });

  it("só escolhe quem está na fila da tarefa", () => {
    const movable = Array.from({ length: 4 }, (_, i) => occ(`o${i}`, `t${i}`, "2026-10-23", "a", ["a", "b"]));
    const after = applyPlan(movable, balance({ movable, fixed: [], people: P, mode: "daily" }).changes);
    expect(count(after, "c")).toBe(0);
    expect([count(after, "a"), count(after, "b")]).toEqual([2, 2]);
  });

  it("tarefa com um único candidato não muda", () => {
    const movable = [occ("1", "t1", "2026-10-23", "a", ["a"]), occ("2", "t2", "2026-10-23", "a", ["a"])];
    expect(balance({ movable, fixed: [], people: P, mode: "daily" }).changes).toEqual([]);
  });

  it("candidato fora do escopo é ignorado", () => {
    const movable = [occ("1", "t1", "2026-10-23", "a", ["a", "x"]), occ("2", "t2", "2026-10-23", "a", ["a", "x"])];
    const plan = balance({ movable, fixed: [], people: ["a", "b"], mode: "daily" });
    expect(plan.changes.every((c) => c.to !== "x")).toBe(true);
  });
});

describe("balance — diário × semanal", () => {
  // dia 1: 3 tarefas; dia 2: 1 tarefa; todas começam na pessoa a
  const movable = [
    occ("1", "t1", "2026-10-23", "a"),
    occ("2", "t2", "2026-10-23", "a"),
    occ("3", "t3", "2026-10-23", "a"),
    occ("4", "t4", "2026-10-24", "a"),
  ];

  it("diário equilibra cada dia", () => {
    const plan = balance({ movable, fixed: [], people: P, mode: "daily" });
    const after = applyPlan(movable, plan.changes);
    expect(Math.max(...P.map((p) => count(after, p, "2026-10-23")))).toBe(1);
    expect(plan.spreadAfter).toBeLessThanOrEqual(1);
  });

  it("semanal equilibra o total da janela (4 tarefas / 3 pessoas → 2,1,1)", () => {
    const plan = balance({ movable, fixed: [], people: P, mode: "weekly" });
    const totals = P.map((p) => count(applyPlan(movable, plan.changes), p)).sort();
    expect(totals).toEqual([1, 1, 2]);
  });
});

describe("balance — pontos", () => {
  it("pesos: 10 contra 5+5", () => {
    const movable = [
      occ("1", "t1", "2026-10-23", "a", ["a", "b"], 10),
      occ("2", "t2", "2026-10-23", "a", ["a", "b"], 5),
      occ("3", "t3", "2026-10-23", "a", ["a", "b"], 5),
    ];
    const plan = balance({ movable, fixed: [], people: ["a", "b"], mode: "daily" });
    expect(plan.spreadAfter).toBe(0);
    expect(plan.after["2026-10-23"]).toEqual({ a: 10, b: 10 });
  });

  it("weightOf: tarefas = 1; pontos só em ambiente gamificado", () => {
    expect(weightOf("count", 25, false)).toBe(1);
    expect(weightOf("points", 25, true)).toBe(25);
    expect(weightOf("points", 25, false)).toBe(0);
  });
});

describe("balance — rodízio de cada tarefa e garantias", () => {
  it("uma tarefa diária continua girando pela fila (a, b, c…)", () => {
    const days = ["2026-10-23", "2026-10-24", "2026-10-25"];
    const movable = days.map((d, i) => occ(`o${i}`, "t1", d, "a"));
    const after = applyPlan(movable, balance({ movable, fixed: [], people: P, mode: "weekly" }).changes);
    expect(new Set(after.map((o) => o.assignee)).size).toBe(3);
  });

  it("nunca piora: com carga fixa desigual e nada a melhorar, não muda", () => {
    const movable = [occ("1", "t1", "2026-10-23", "b", ["b"])];
    const fixed = [{ date: "2026-10-23", userId: "a", weight: 5 }];
    const plan = balance({ movable, fixed, people: P, mode: "daily" });
    expect(plan.changes).toEqual([]);
    expect(plan.spreadAfter).toBe(plan.spreadBefore);
  });

  it("propriedade: em 200 cenários aleatórios, a diferença nunca aumenta e a 2ª execução é vazia", () => {
    let seed = 12345;
    const rnd = (n: number) => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed % n;
    };
    for (let k = 0; k < 200; k++) {
      const people = ["a", "b", "c", "d"].slice(0, 2 + rnd(3));
      const days = ["2026-10-23", "2026-10-24", "2026-10-25"];
      const movable: BalanceOcc[] = Array.from({ length: 1 + rnd(12) }, (_, i) => {
        const cands = people.filter(() => rnd(3) > 0);
        return occ(`o${i}`, `t${rnd(5)}x${i % 3}`, days[rnd(3)], people[rnd(people.length)], cands.length ? cands : [people[0]], 1 + rnd(3));
      });
      const fixed = Array.from({ length: rnd(4) }, () => ({ date: days[rnd(3)], userId: people[rnd(people.length)], weight: 1 + rnd(2) }));
      const mode = rnd(2) ? "daily" : "weekly";
      const plan = balance({ movable, fixed, people, mode });
      expect(plan.spreadAfter).toBeLessThanOrEqual(plan.spreadBefore);
      const again = balance({ movable: applyPlan(movable, plan.changes), fixed, people, mode });
      expect(again.changes).toEqual([]);
    }
  });
});
