import type { SupabaseClient } from "@supabase/supabase-js";
import { getCriterionToCategory, getCriterionToDimensionCode } from "@/lib/evaluation-config";
import { loadAllEvaluationConfigs } from "@/lib/load-evaluation-config";
import type { ModalityConfig } from "@/lib/performance-utils";
import { computeEvolutionScore, type DatedEvaluation } from "@/lib/rank-evolution";
import type { LeaderboardFilters } from "@/lib/leaderboard";

const ATHLETE_ID_CHUNK = 80;

export type EvolutionLeaderboardRow = {
  rank: number;
  student_id: string;
  display_name: string;
  delta: number;
  athlete_id: string;
  is_current_user: boolean;
};

export type EvolutionLeaderboardResult = {
  rows: EvolutionLeaderboardRow[];
  /** Candidatos elegíveis pelos filtros mas sem avaliações suficientes no período — excluídos do ranking. */
  excludedCount: number;
  error: string | null;
};

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Ranking por evolução nas dimensões de performance (não XP): compara a última avaliação
 * disponível antes do período com a última avaliação até ao fim do período, por atleta.
 * Cálculo em app layer (não SQL) — a lógica de mapear `AthleteEvaluation.scores` (JSONB,
 * config por modalidade) para as 5 dimensões já vive em `lib/performance-utils.ts`.
 */
export async function getEvolutionLeaderboard(
  supabase: SupabaseClient,
  filters: LeaderboardFilters,
  periodStart: string | null,
  periodEnd: string,
  limit = 100
): Promise<EvolutionLeaderboardResult> {
  // Reaproveita a mesma lógica de scope (escola/modalidade/idade) do ranking XP em SQL,
  // sem duplicar o cálculo de faixa etária em TypeScript.
  const { data: candidateRows, error } = await supabase.rpc("get_leaderboard_filtered", {
    p_school_id: filters.schoolId ?? null,
    p_modality: filters.modality ?? null,
    p_age_bucket: filters.ageBucket ?? null,
    p_limit: 500,
    p_period_start: null,
  });
  if (error) return { rows: [], excludedCount: 0, error: error.message };

  const candidates = (Array.isArray(candidateRows) ? candidateRows : []) as Array<{
    student_id: string;
    display_name: string;
    athlete_id: string;
    is_current_user: boolean;
  }>;
  if (candidates.length === 0) return { rows: [], excludedCount: 0, error: null };

  const athleteIds = candidates.map((c) => c.athlete_id);

  const configPayloads = await loadAllEvaluationConfigs(supabase);
  const configByModality = new Map<string, ModalityConfig>();
  for (const [mod, payload] of configPayloads) {
    if (!payload) continue;
    configByModality.set(mod, {
      criterionToCategory: getCriterionToCategory(payload),
      criterionToDimensionCode: getCriterionToDimensionCode(payload),
    });
  }

  const evaluationsByAthlete = new Map<string, DatedEvaluation[]>();
  for (const ids of chunk(athleteIds, ATHLETE_ID_CHUNK)) {
    const { data } = await supabase
      .from("AthleteEvaluation")
      .select("athleteId, gas, technique, strength, theory, scores, modality, created_at")
      .in("athleteId", ids)
      .lte("created_at", periodEnd);
    for (const row of data ?? []) {
      const athleteId = row.athleteId as string;
      const list = evaluationsByAthlete.get(athleteId) ?? [];
      list.push({
        gas: row.gas as number | null,
        technique: row.technique as number | null,
        strength: row.strength as number | null,
        theory: row.theory as number | null,
        scores: (row.scores as Record<string, number> | null) ?? null,
        modality: row.modality as string | null,
        createdAt: String(row.created_at ?? ""),
      });
      evaluationsByAthlete.set(athleteId, list);
    }
  }

  const scored: EvolutionLeaderboardRow[] = [];
  let excludedCount = 0;

  for (const c of candidates) {
    const evaluations = evaluationsByAthlete.get(c.athlete_id) ?? [];
    const { delta } = computeEvolutionScore(evaluations, configByModality, periodStart, periodEnd);
    if (delta == null) {
      excludedCount++;
      continue;
    }
    scored.push({
      rank: 0,
      student_id: c.student_id,
      display_name: c.display_name,
      delta,
      athlete_id: c.athlete_id,
      is_current_user: c.is_current_user,
    });
  }

  scored.sort((a, b) => b.delta - a.delta);
  const limited = scored.slice(0, limit).map((row, i) => ({ ...row, rank: i + 1 }));

  return { rows: limited, excludedCount, error: null };
}
