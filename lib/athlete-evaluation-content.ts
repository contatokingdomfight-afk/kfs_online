/**
 * Dados mínimos de uma linha de `AthleteEvaluation` para decidir o que o aluno pode ver
 * (texto, dimensões ou critérios dinâmicos em `scores`).
 */
export function evaluationHasFeedbackContent(row: {
  note?: string | null;
  gas?: number | null;
  technique?: number | null;
  strength?: number | null;
  theory?: number | null;
  scores?: unknown;
}): boolean {
  if (row.note?.trim()) return true;
  if (row.gas != null || row.technique != null || row.strength != null || row.theory != null) return true;
  return (
    row.scores != null &&
    typeof row.scores === "object" &&
    Object.keys(row.scores as Record<string, unknown>).length > 0
  );
}
