import { describe, expect, it } from "vitest";
import { assigneeForIndex, orderedQueue, type RotationEntry } from "./rotation";

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
