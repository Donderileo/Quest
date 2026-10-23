import { describe, expect, it } from "vitest";
import {
  assigneeForIndex,
  orderedQueue,
  rankRotationTasks,
  rotationStartOffset,
  type RotationEntry,
} from "./rotation";

describe("orderedQueue", () => {
  it("ordena por position", () => {
    const entries: RotationEntry[] = [
      { userId: "c", position: 2 },
      { userId: "a", position: 0 },
      { userId: "b", position: 1 },
    ];
    expect(orderedQueue(entries)).toEqual(["a", "b", "c"]);
  });
});

describe("assigneeForIndex", () => {
  const q = ["a", "b", "c"];

  it("cicla pela fila", () => {
    expect(assigneeForIndex(q, 0)).toBe("a");
    expect(assigneeForIndex(q, 1)).toBe("b");
    expect(assigneeForIndex(q, 2)).toBe("c");
    expect(assigneeForIndex(q, 3)).toBe("a");
    expect(assigneeForIndex(q, 7)).toBe("b");
  });

  it("fila de uma pessoa sempre retorna ela", () => {
    expect(assigneeForIndex(["solo"], 0)).toBe("solo");
    expect(assigneeForIndex(["solo"], 99)).toBe("solo");
  });

  it("fila vazia retorna null", () => {
    expect(assigneeForIndex([], 0)).toBeNull();
  });

  it("é determinística (idempotente)", () => {
    expect(assigneeForIndex(q, 5)).toBe(assigneeForIndex(q, 5));
  });
});

describe("escalonamento do rodízio (rankRotationTasks / rotationStartOffset)", () => {
  const queue = ["a", "b", "c"];
  const mk = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      id: `t${String(i).padStart(2, "0")}`,
      createdAt: `2026-10-20T10:00:0${i}.000Z`,
    }));

  it("ordena por criação e desempata por id", () => {
    const ranks = rankRotationTasks([
      { id: "z", createdAt: "2026-10-20T10:00:05.000Z" },
      { id: "b", createdAt: "2026-10-20T10:00:01.000Z" },
      { id: "a", createdAt: "2026-10-20T10:00:01.000Z" },
    ]);
    expect([ranks.get("a"), ranks.get("b"), ranks.get("z")]).toEqual([0, 1, 2]);
  });

  it("sem escalonar, 6 tarefas iguais caem todas na mesma pessoa no dia 0 (o defeito)", () => {
    const day0 = mk(6).map(() => assigneeForIndex(queue, 0));
    expect(new Set(day0).size).toBe(1);
  });

  it("escalonado, 6 tarefas iguais se espalham por igual (2 para cada)", () => {
    const ranks = rankRotationTasks(mk(6));
    const day0 = mk(6).map((t) => assigneeForIndex(queue, 0 + rotationStartOffset(ranks.get(t.id)!)));
    const count = (u: string) => day0.filter((x) => x === u).length;
    expect([count("a"), count("b"), count("c")]).toEqual([2, 2, 2]);
  });

  it("cada tarefa continua percorrendo a fila inteira ao longo dos dias", () => {
    const off = rotationStartOffset(2);
    const week = [0, 1, 2, 3, 4, 5].map((i) => assigneeForIndex(queue, i + off));
    expect(new Set(week)).toEqual(new Set(queue));
  });

  it("é estável: mesma entrada, mesmo resultado", () => {
    expect([...rankRotationTasks(mk(4))]).toEqual([...rankRotationTasks(mk(4))]);
  });
});
