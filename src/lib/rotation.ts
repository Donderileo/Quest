/**
 * Rodízio de tarefas: fila circular com ordem fixa.
 *
 * A atribuição é determinística em função do índice da ocorrência (a
 * n-ésima ocorrência gerada vai para a n-ésima pessoa da fila, ciclando).
 * Sendo determinística, gerar a mesma ocorrência duas vezes resulta no
 * mesmo responsável — idempotente para o job de geração.
 */

export interface RotationEntry {
  userId: string;
  position: number;
}

/** Ordena a fila por `position` e retorna apenas os ids. */
export function orderedQueue(entries: RotationEntry[]): string[] {
  return [...entries]
    .sort((a, b) => a.position - b.position)
    .map((e) => e.userId);
}

/**
 * Responsável pela ocorrência de índice `index` (0-based) dada a fila ordenada.
 * Retorna null se a fila estiver vazia.
 */
export function assigneeForIndex(
  orderedUserIds: string[],
  index: number,
): string | null {
  if (orderedUserIds.length === 0) return null;
  const i = ((index % orderedUserIds.length) + orderedUserIds.length) %
    orderedUserIds.length;
  return orderedUserIds[i];
}

/**
 * Posição (0-based) de cada tarefa de rodízio entre as da casa, por (criação, id): estável e determinística.
 * Serve para escalonar o início do rodízio de cada tarefa.
 */
export function rankRotationTasks(tasks: { id: string; createdAt: string }[]): Map<string, number> {
  const sorted = [...tasks].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id),
  );
  return new Map(sorted.map((t, i) => [t.id, i]));
}

/**
 * Deslocamento do início do rodízio para uma tarefa de posição `rank`.
 * Sem isso, tarefas criadas juntas e com a mesma fila caem todas na MESMA pessoa no mesmo dia
 * (o índice só dependia da própria tarefa). Com o deslocamento, N tarefas iguais se espalham
 * entre as pessoas já no primeiro dia, e cada uma continua percorrendo a fila inteira.
 */
export function rotationStartOffset(rank: number): number {
  return Math.max(0, rank);
}
