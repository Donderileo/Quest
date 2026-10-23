/**
 * Dados do balanceamento e a conversão (pura) para a entrada de `balance()`.
 * Sem imports de servidor: a tela usa isto no cliente para a prévia instantânea, e a action usa o
 * mesmo código no servidor para recalcular antes de aplicar (nunca se confia no plano do cliente).
 */
import {
  weightOf,
  type BalanceInput,
  type BalanceMetric,
  type BalanceMode,
  type BalanceOcc,
  type FixedLoad,
} from "@/lib/balance";

export type BalanceRow = {
  id: string;
  taskId: string;
  date: string;
  status: "pending" | "done";
  assignee: string | null;
  type: "fixed" | "rotation";
  points: number;
  gamified: boolean;
  spaceId: string;
  /** fila do rodízio, na ordem (vazio em tarefas fixas) */
  candidates: string[];
};
export type BalancePerson = { id: string; name: string; avatar_url: string | null };
export type BalanceSpace = { id: string; name: string; icon: string | null; mode: string; memberIds: string[] };
export type BalanceData = { rows: BalanceRow[]; people: BalancePerson[]; spaces: BalanceSpace[] };

export type BalanceOptions = { spaceIds: string[]; metric: BalanceMetric; mode: BalanceMode };

const inScope = (spaceIds: string[], id: string) => spaceIds.length === 0 || spaceIds.includes(id);

/** "Pontos" só faz sentido se há tarefa com pontos em ambiente gamificado dentro do escopo. */
export function pointsAvailable(data: BalanceData, spaceIds: string[]): boolean {
  return data.rows.some((r) => r.gamified && r.points > 0 && inScope(spaceIds, r.spaceId));
}

/** Ids das pessoas que entram na conta, na ordem de `data.people` (estável). */
export function scopePeople(data: BalanceData, spaceIds: string[]): BalancePerson[] {
  const ids = new Set<string>();
  for (const s of data.spaces) if (inScope(spaceIds, s.id)) s.memberIds.forEach((m) => ids.add(m));
  for (const r of data.rows) {
    if (!inScope(spaceIds, r.spaceId)) continue;
    if (r.assignee) ids.add(r.assignee);
    r.candidates.forEach((c) => ids.add(c));
  }
  return data.people.filter((p) => ids.has(p.id));
}

export function buildBalanceInput(data: BalanceData, opts: BalanceOptions): BalanceInput {
  const movable: BalanceOcc[] = [];
  const fixed: FixedLoad[] = [];

  for (const r of data.rows) {
    if (!inScope(opts.spaceIds, r.spaceId)) continue;
    const weight = weightOf(opts.metric, r.points, r.gamified);
    if (r.type === "rotation" && r.status === "pending" && r.candidates.length > 0) {
      movable.push({ id: r.id, taskId: r.taskId, date: r.date, weight, candidates: r.candidates, assignee: r.assignee });
    } else if (r.assignee) {
      // fixas e concluídas: contam como carga, mas não mudam
      fixed.push({ date: r.date, userId: r.assignee, weight });
    }
  }

  return {
    movable,
    fixed,
    people: scopePeople(data, opts.spaceIds).map((p) => p.id),
    mode: opts.mode,
  };
}
