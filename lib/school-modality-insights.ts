import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getCriterionToCategory,
  getCriterionToDimensionCode,
  type ModalityEvaluationConfigPayload,
} from "@/lib/evaluation-config";
import { loadEvaluationConfigForModality } from "@/lib/load-evaluation-config";
import {
  buildCriterionScores,
  getStrengthsAndWeaknesses,
  type CriterionScoreItem,
  type DimensionScore,
} from "@/lib/evaluation-results-data";
import {
  computeGeneralPerformanceScores,
  GENERAL_PERFORMANCE_AXES,
  type GeneralScoresInputEval,
  type ModalityConfig,
} from "@/lib/performance-utils";

const ATHLETE_ID_CHUNK = 80;

export type SchoolModalityInsights = {
  modality: string;
  modalityLabel: string;
  athleteCount: number;
  evaluationCount: number;
  dimensionScores: DimensionScore[];
  scoresForRadar: Record<string, number>;
  overallScore: number;
  strengths: CriterionScoreItem[];
  weaknesses: CriterionScoreItem[];
};

type EvalRow = {
  athleteId: string;
  gas: number | null;
  technique: number | null;
  strength: number | null;
  theory: number | null;
  scores: Record<string, number> | null;
  modality: string | null;
  created_at: string;
};

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function buildConfigMap(modality: string, config: ModalityEvaluationConfigPayload | null): Map<string, ModalityConfig> {
  const map = new Map<string, ModalityConfig>();
  if (!config) return map;
  map.set(modality, {
    criterionToCategory: getCriterionToCategory(config),
    criterionToDimensionCode: getCriterionToDimensionCode(config),
  });
  return map;
}

/** Última avaliação por atleta para a modalidade pedida. */
function latestEvalPerAthlete(rows: EvalRow[]): EvalRow[] {
  const byAthlete = new Map<string, EvalRow>();
  for (const row of rows) {
    const prev = byAthlete.get(row.athleteId);
    if (!prev || row.created_at > prev.created_at) byAthlete.set(row.athleteId, row);
  }
  return [...byAthlete.values()];
}

function averageDimensionScores(perAthleteDims: Record<string, number>[]): Record<string, number> {
  const sums: Record<string, number> = {};
  const counts: Record<string, number> = {};
  for (const dims of perAthleteDims) {
    for (const [id, score] of Object.entries(dims)) {
      sums[id] = (sums[id] ?? 0) + score;
      counts[id] = (counts[id] ?? 0) + 1;
    }
  }
  const out: Record<string, number> = {};
  for (const axis of GENERAL_PERFORMANCE_AXES) {
    const n = counts[axis.id] ?? 0;
    if (n > 0) {
      const avg = (sums[axis.id] ?? 0) / n;
      out[axis.id] = Math.round(Math.min(10, Math.max(0, avg)) * 10) / 10;
    } else {
      out[axis.id] = 0;
    }
  }
  return out;
}

function aggregateCriterionAverages(items: CriterionScoreItem[]): CriterionScoreItem[] {
  const acc = new Map<
    string,
    { sum: number; count: number; label: string; categoryName: string; modality: string }
  >();
  for (const item of items) {
    const cur = acc.get(item.criterionId);
    if (cur) {
      cur.sum += item.score;
      cur.count += 1;
    } else {
      acc.set(item.criterionId, {
        sum: item.score,
        count: 1,
        label: item.label,
        categoryName: item.categoryName,
        modality: item.modality,
      });
    }
  }
  return [...acc.entries()]
    .map(([criterionId, v]) => ({
      criterionId,
      label: v.label,
      categoryName: v.categoryName,
      modality: v.modality,
      maxScore: 10,
      score: Math.round((v.sum / v.count) * 10) / 10,
    }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Médias da escola numa modalidade: radar por dimensão + pontos fortes / a melhorar (critérios).
 * Usa a última avaliação de cada atleta na modalidade.
 */
export async function buildSchoolModalityInsights(
  supabase: SupabaseClient,
  schoolId: string,
  modality: string,
  modalityLabel: string
): Promise<SchoolModalityInsights | null> {
  const config = await loadEvaluationConfigForModality(supabase, modality);
  if (!config) return emptyInsights(modality, modalityLabel);

  const configForDetail = [{ modality, config }];
  const configByModality = buildConfigMap(modality, config);

  const { data: students } = await supabase
    .from("Student")
    .select("id")
    .eq("schoolId", schoolId)
    .eq("status", "ATIVO");

  const studentIds = (students ?? []).map((s) => s.id as string);
  if (studentIds.length === 0) {
    return emptyInsights(modality, modalityLabel);
  }

  const athleteIds: string[] = [];
  for (const ids of chunk(studentIds, ATHLETE_ID_CHUNK)) {
    const { data: athletes } = await supabase.from("Athlete").select("id").in("studentId", ids);
    for (const a of athletes ?? []) athleteIds.push(a.id as string);
  }

  if (athleteIds.length === 0) {
    return emptyInsights(modality, modalityLabel);
  }

  const evalRows: EvalRow[] = [];
  for (const ids of chunk(athleteIds, ATHLETE_ID_CHUNK)) {
    const { data } = await supabase
      .from("AthleteEvaluation")
      .select("athleteId, gas, technique, strength, theory, scores, modality, created_at")
      .in("athleteId", ids)
      .eq("modality", modality)
      .order("created_at", { ascending: false });
    for (const row of data ?? []) {
      evalRows.push({
        athleteId: row.athleteId as string,
        gas: row.gas as number | null,
        technique: row.technique as number | null,
        strength: row.strength as number | null,
        theory: row.theory as number | null,
        scores: (row.scores as Record<string, number> | null) ?? null,
        modality: row.modality as string | null,
        created_at: String(row.created_at ?? ""),
      });
    }
  }

  if (evalRows.length === 0) {
    return emptyInsights(modality, modalityLabel);
  }

  const latest = latestEvalPerAthlete(evalRows);
  const perAthleteCriteria: CriterionScoreItem[] = [];
  const perAthleteDims: Record<string, number>[] = [];

  for (const ev of latest) {
    const evalInput: GeneralScoresInputEval = {
      gas: ev.gas,
      technique: ev.technique,
      strength: ev.strength,
      theory: ev.theory,
      scores: ev.scores,
      modality: ev.modality,
    };

    perAthleteDims.push(
      computeGeneralPerformanceScores([evalInput], configByModality, 1, true)
    );

    const criteria = buildCriterionScores(ev.scores, configForDetail, null, {
      evaluationModality: modality,
    });
    perAthleteCriteria.push(...criteria);
  }

  const averagedCriteria = aggregateCriterionAverages(perAthleteCriteria);
  const { strengths, weaknesses } = getStrengthsAndWeaknesses(averagedCriteria, 5);
  const scoresForRadar = averageDimensionScores(perAthleteDims);

  const dimensionScores: DimensionScore[] = GENERAL_PERFORMANCE_AXES.map((a) => ({
    id: a.id,
    label: a.label,
    score: scoresForRadar[a.id] ?? 0,
    maxScore: 10,
  }));

  const overallScore =
    dimensionScores.length > 0
      ? Math.round(
          (dimensionScores.reduce((s, d) => s + d.score, 0) / dimensionScores.length) * 10
        ) / 10
      : 0;

  return {
    modality,
    modalityLabel,
    athleteCount: latest.length,
    evaluationCount: evalRows.length,
    dimensionScores,
    scoresForRadar,
    overallScore,
    strengths,
    weaknesses,
  };
}

function emptyInsights(modality: string, modalityLabel: string): SchoolModalityInsights {
  const dimensionScores: DimensionScore[] = GENERAL_PERFORMANCE_AXES.map((a) => ({
    id: a.id,
    label: a.label,
    score: 0,
    maxScore: 10,
  }));
  return {
    modality,
    modalityLabel,
    athleteCount: 0,
    evaluationCount: 0,
    dimensionScores,
    scoresForRadar: Object.fromEntries(GENERAL_PERFORMANCE_AXES.map((a) => [a.id, 0])),
    overallScore: 0,
    strengths: [],
    weaknesses: [],
  };
}
