/**
 * Detalhe de uma linha de AthleteEvaluation para o modal do histórico (aluno ou coach).
 * `previous` é a avaliação imediatamente anterior no tempo (mesmo atleta), para mostrar evolução.
 */
export type EvaluationHistoryModalDetail = {
  id: string;
  coachName: string;
  date: string;
  note: string | null;
  modality: string | null;
  gas: number | null;
  technique: number | null;
  strength: number | null;
  theory: number | null;
  scores: Record<string, number> | null;
  criterionLabels?: Record<string, string>;
  previous: {
    gas: number | null;
    technique: number | null;
    strength: number | null;
    theory: number | null;
    scores: Record<string, number> | null;
  } | null;
};
