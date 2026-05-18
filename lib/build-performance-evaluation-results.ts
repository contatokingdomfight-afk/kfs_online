import type { ModalityEvaluationConfigPayload } from "@/lib/evaluation-config";
import {
  GENERAL_PERFORMANCE_AXES,
  computeGeneralPerformanceScores,
  computePerformanceScoresByModality,
  mergePhysicalAssessmentIntoRadar,
  EVALUATION_CRITERION_AGGREGATION_BASELINE,
  type ModalityConfig,
} from "@/lib/performance-utils";
import {
  buildCriterionScores,
  buildCriterionScoresFromDimensionScores,
  type CriterionScoreItem,
  type DimensionScore,
} from "@/lib/evaluation-results-data";

const DEFAULT_GENERAL_LAST_N = 10;
const DEFAULT_LAST_N_PER_MODALITY = 5;

export type AthleteEvaluationAggregateRow = {
  gas: number | null;
  technique: number | null;
  strength: number | null;
  theory: number | null;
  scores: Record<string, number> | null;
  modality: string | null;
};

export type EvaluationResultsDataBundle = {
  generalPerformanceScores: Record<string, number>;
  scoresByModality: Record<string, Record<string, number>>;
  evaluationResultsData: {
    dimensionScores: DimensionScore[];
    criterionScores: CriterionScoreItem[];
    overallScore: number;
    scoresForRadar: Record<string, number>;
  };
};

/**
 * Agrega linhas `AthleteEvaluation` para radar geral, KPIs por modalidade e dados do
 * `EvaluationResultsDashboard` (critérios por categoria, baseline 5 para JSON esparsos).
 */
export function buildEvaluationResultsFromAthleteEvaluations(
  evalsRows: AthleteEvaluationAggregateRow[],
  configsForDetail: { modality: string; config: ModalityEvaluationConfigPayload }[],
  configByModality: Map<string, ModalityConfig>,
  options?: {
    normalizedPhysicalForm?: unknown | null;
    generalLastN?: number;
    lastNPerModality?: number;
  }
): EvaluationResultsDataBundle | null {
  if (!evalsRows.length) return null;
  const generalLastN = options?.generalLastN ?? DEFAULT_GENERAL_LAST_N;
  const lastNPerModality = options?.lastNPerModality ?? DEFAULT_LAST_N_PER_MODALITY;
  const slice = evalsRows.slice(0, generalLastN);
  const evaluations = slice.map((e) => ({
    gas: e.gas,
    technique: e.technique,
    strength: e.strength,
    theory: e.theory,
    scores: e.scores,
    modality: e.modality,
  }));

  let generalPerformanceScores = computeGeneralPerformanceScores(
    evaluations,
    configByModality,
    generalLastN,
    true
  );
  if (options?.normalizedPhysicalForm && generalPerformanceScores) {
    generalPerformanceScores = mergePhysicalAssessmentIntoRadar(
      generalPerformanceScores,
      options.normalizedPhysicalForm
    );
  }

  const scoresByModality = computePerformanceScoresByModality(
    evaluations,
    configByModality,
    lastNPerModality,
    true
  );

  const latestEval = slice[0];
  const previousEval = slice.length > 1 ? slice[1] : null;
  const criterionScoresFromEval = buildCriterionScores(
    latestEval?.scores ?? null,
    configsForDetail,
    previousEval?.scores ?? null,
    {
      implicitCriterionBaseline: EVALUATION_CRITERION_AGGREGATION_BASELINE,
      evaluationModality: latestEval?.modality ?? null,
    }
  );

  const dimensionScores: DimensionScore[] = GENERAL_PERFORMANCE_AXES.map((a) => ({
    id: a.id,
    label: a.label,
    score: generalPerformanceScores[a.id] ?? 0,
    maxScore: 10,
  }));
  const overallScore =
    dimensionScores.length > 0
      ? dimensionScores.reduce((s, d) => s + d.score, 0) / dimensionScores.length
      : 0;
  const scoresForRadar = { ...generalPerformanceScores };
  const criterionScores =
    criterionScoresFromEval.length > 0
      ? criterionScoresFromEval
      : buildCriterionScoresFromDimensionScores(configsForDetail, generalPerformanceScores);

  return {
    generalPerformanceScores,
    scoresByModality,
    evaluationResultsData: {
      dimensionScores,
      criterionScores,
      overallScore,
      scoresForRadar,
    },
  };
}
