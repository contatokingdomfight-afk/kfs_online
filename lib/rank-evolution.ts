import {
  computeGeneralPerformanceScores,
  GENERAL_PERFORMANCE_AXES,
  type GeneralScoresInputEval,
  type ModalityConfig,
} from "@/lib/performance-utils";

export type DatedEvaluation = GeneralScoresInputEval & { createdAt: string };

export type EvolutionScoreResult = {
  baselineScore: number | null;
  latestScore: number | null;
  /** latestScore - baselineScore (média das 5 dimensões, escala 1-10); null se faltar um dos dois lados. */
  delta: number | null;
};

/**
 * Score geral (1-10) da avaliação mais recente na data indicada ou antes dela.
 * `evaluations` deve vir ordenado ascendente por `createdAt`.
 */
function scoreAtOrBefore(
  evaluations: DatedEvaluation[],
  configByModality: Map<string, ModalityConfig>,
  cutoffIso: string | null
): number | null {
  const eligible = cutoffIso ? evaluations.filter((e) => e.createdAt <= cutoffIso) : evaluations;
  if (eligible.length === 0) return null;
  const latest = eligible[eligible.length - 1]!;
  const scores = computeGeneralPerformanceScores([latest], configByModality, 1, true);
  const vals = GENERAL_PERFORMANCE_AXES.map((a) => scores[a.id] ?? 0);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/**
 * Baseline = avaliação mais recente <= periodStart (ou a mais antiga disponível, se nenhuma
 * existir antes do período — evita excluir quem entrou a meio do período; nota: isto pode
 * inflacionar a evolução de quem só tem histórico curto, aceite como limitação conhecida).
 * Latest = avaliação mais recente <= periodEnd. Delta = latest - baseline (média 1-10, não soma —
 * mantém a mesma escala do resto da UI de performance).
 */
export function computeEvolutionScore(
  evaluations: DatedEvaluation[],
  configByModality: Map<string, ModalityConfig>,
  periodStart: string | null,
  periodEnd: string
): EvolutionScoreResult {
  const sorted = [...evaluations].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (sorted.length === 0) return { baselineScore: null, latestScore: null, delta: null };

  let baselineScore = periodStart ? scoreAtOrBefore(sorted, configByModality, periodStart) : null;
  if (baselineScore == null) {
    baselineScore = scoreAtOrBefore([sorted[0]!], configByModality, null);
  }

  const latestScore = scoreAtOrBefore(sorted, configByModality, periodEnd);
  if (latestScore == null || baselineScore == null) {
    return { baselineScore, latestScore: null, delta: null };
  }
  return { baselineScore, latestScore, delta: Math.round((latestScore - baselineScore) * 100) / 100 };
}
