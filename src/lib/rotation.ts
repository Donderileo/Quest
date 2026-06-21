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
