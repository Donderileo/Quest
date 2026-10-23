/**
 * Balanceamento de tarefas de rodízio.
 *
 * Função pura: recebe as ocorrências que PODEM mudar de responsável (pendentes, de hoje em diante,
 * de tarefas em rodízio — com a fila de candidatos) e a carga que NÃO muda (tarefas fixas e
 * ocorrências já concluídas), e devolve quem deveria fazer cada uma para deixar a carga o mais
 * igual possível entre as pessoas.
 *
 * - modo "daily": cada dia é equilibrado separadamente; "weekly": a janela toda é um balde só.
 * - peso: 1 por tarefa (medida "tarefas") ou os pontos da tarefa (medida "pontos").
 * - determinístico e idempotente: rodar de novo sobre o resultado não muda nada.
 * - nunca piora: se o resultado não reduz a diferença (máx−mín), nada muda.
 */

export type BalanceMode = "daily" | "weekly";
export type BalanceMetric = "count" | "points";

export interface BalanceOcc {
  id: string;
  taskId: string;
  /** yyyy-MM-dd */
  date: string;
  weight: number;
  /** pessoas que podem fazer (fila do rodízio), na ordem da fila */
  candidates: string[];
  /** responsável atual */
  assignee: string | null;
}

export interface FixedLoad {
  date: string;
  userId: string;
  weight: number;
}

export interface BalanceInput {
  movable: BalanceOcc[];
  fixed: FixedLoad[];
  /** todas as pessoas do escopo (a diferença é medida entre elas) */
  people: string[];
  mode: BalanceMode;
}

export interface BalanceChange {
  id: string;
  from: string | null;
  to: string;
}

export type LoadTable = Record<string, Record<string, number>>;

export interface BalancePlan {
  changes: BalanceChange[];
  before: LoadTable;
  after: LoadTable;
  /** pior diferença (máx−mín entre pessoas) entre os baldes */
  spreadBefore: number;
  spreadAfter: number;
}

/** Peso de uma tarefa: 1 em "tarefas"; pontos da tarefa em "pontos" (0 se o ambiente não é gamificado). */
export function weightOf(metric: BalanceMetric, points: number, gamified: boolean): number {
  return metric === "count" ? 1 : gamified ? points : 0;
}

const bucketOf = (mode: BalanceMode, date: string) => (mode === "weekly" ? "semana" : date);

function emptyLoads(mode: BalanceMode, people: string[], dates: string[]): LoadTable {
  const table: LoadTable = {};
  for (const d of dates) {
    const b = bucketOf(mode, d);
    if (!table[b]) table[b] = Object.fromEntries(people.map((p) => [p, 0]));
  }
  return table;
}

function worstSpread(table: LoadTable): number {
  let worst = 0;
  for (const bucket of Object.values(table)) {
    const values = Object.values(bucket);
    if (values.length) worst = Math.max(worst, Math.max(...values) - Math.min(...values));
  }
  return worst;
}

const cloneTable = (t: LoadTable): LoadTable =>
  Object.fromEntries(Object.entries(t).map(([k, v]) => [k, { ...v }]));

export function balance(input: BalanceInput): BalancePlan {
  const { movable, fixed, people, mode } = input;
  const dates = [...movable.map((o) => o.date), ...fixed.map((f) => f.date)];
  const known = new Set(people);

  // carga fixa (não muda): tarefas fixas + já concluídas
  const base = emptyLoads(mode, people, dates);
  for (const f of fixed) {
    if (known.has(f.userId)) base[bucketOf(mode, f.date)][f.userId] += f.weight;
  }

  // "agora": fixa + movíveis nos responsáveis atuais
  const before = cloneTable(base);
  for (const o of movable) {
    if (o.assignee && known.has(o.assignee)) before[bucketOf(mode, o.date)][o.assignee] += o.weight;
  }

  // plano: parte só da carga fixa e coloca os movíveis, do mais pesado para o mais leve
  const load = cloneTable(base);
  const perTask = new Map<string, Map<string, number>>(); // quantas vezes cada pessoa já tem ESTA tarefa
  const lastByTask = new Map<string, string>(); // responsável da ocorrência anterior da mesma tarefa
  const planned = new Map<string, string>();

  const order = [...movable].sort(
    (a, b) =>
      b.weight - a.weight ||
      a.date.localeCompare(b.date) ||
      a.taskId.localeCompare(b.taskId) ||
      a.id.localeCompare(b.id),
  );

  for (const o of order) {
    const candidates = o.candidates.filter((c) => known.has(c));
    if (candidates.length === 0) {
      if (o.assignee) planned.set(o.id, o.assignee);
      continue;
    }
    const bucket = bucketOf(mode, o.date);
    const counts = perTask.get(o.taskId) ?? new Map<string, number>();
    const previous = lastByTask.get(o.taskId);

    // critérios (menor é melhor): carga no balde → vezes que já tem esta tarefa → repetir a anterior
    const key = (u: string) =>
      [load[bucket][u], counts.get(u) ?? 0, u === previous ? 1 : 0] as const;
    const cmp = (a: readonly number[], b: readonly number[]) => {
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
      return 0;
    };

    let winner = candidates[0];
    for (const u of candidates) if (cmp(key(u), key(winner)) < 0) winner = u;

    // empate nos critérios com o responsável atual → mantém (não move à toa)
    const current = o.assignee && candidates.includes(o.assignee) ? o.assignee : null;
    const chosen = current && cmp(key(current), key(winner)) === 0 ? current : winner;

    planned.set(o.id, chosen);
    load[bucket][chosen] += o.weight;
    counts.set(chosen, (counts.get(chosen) ?? 0) + 1);
    perTask.set(o.taskId, counts);
    lastByTask.set(o.taskId, chosen);
  }

  const spreadBefore = worstSpread(before);
  const spreadAfter = worstSpread(load);

  // nunca piora: se não melhora a diferença, não muda nada
  if (spreadAfter >= spreadBefore) {
    return { changes: [], before, after: before, spreadBefore, spreadAfter: spreadBefore };
  }

  const changes: BalanceChange[] = [];
  for (const o of movable) {
    const to = planned.get(o.id);
    if (to && to !== o.assignee) changes.push({ id: o.id, from: o.assignee, to });
  }
  return { changes, before, after: load, spreadBefore, spreadAfter };
}

/** Aplica um plano às ocorrências (para checar idempotência e para pré-visualizar). */
export function applyPlan(movable: BalanceOcc[], changes: BalanceChange[]): BalanceOcc[] {
  const to = new Map(changes.map((c) => [c.id, c.to]));
  return movable.map((o) => (to.has(o.id) ? { ...o, assignee: to.get(o.id)! } : o));
}
