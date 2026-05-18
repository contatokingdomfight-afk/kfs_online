import type { SupabaseClient } from "@supabase/supabase-js";
import { computeGeneralPerformanceScores } from "@/lib/performance-utils";
import { getCriterionToCategory, getCriterionToDimensionCode } from "@/lib/evaluation-config";
import { loadEvaluationConfigForModality } from "@/lib/load-evaluation-config";
import { GENERAL_PERFORMANCE_AXES } from "@/lib/performance-utils";
import {
  getBeltFromXp,
  getBeltName,
  BELT_NAMES,
  getBeltIndexFromXp,
  getXpThresholdForBeltIndex,
  getMinMonthsInCurrentBeltForNextPromotion,
  getMinCalendarDaysInBeltForNextPromotion,
} from "@/lib/belts";
import { syncAthleteDisplayBelt } from "@/lib/sync-athlete-display-belt";

/** Faixas (cores) – alias para compatibilidade. */
export const FIGHTER_RANKS = BELT_NAMES as unknown as readonly string[];

/** XP atribuído por cada missão de dimensão concluída (atingir target 1–10). */
export const XP_PER_MISSION = 50;

export type BeltTimeGateInfo = {
  /** Meses exigidos na faixa atual (regra: 2 meses na 1.ª; depois 2×+1). */
  minMonthsRequired: number;
  /** ~30 d/mês, para barra textual e comparação. */
  minDaysRequired: number;
  daysElapsedInBelt: number;
  /** XP já permite o próximo degrau, mas ainda não passou o tempo mínimo na faixa. */
  waitingOnTime: boolean;
};

export type RankInfo = {
  rankIndex: number;
  rankName: string;
  level: number;
  xpCurrent: number;
  xpNext: number;
  beltTimeGate?: BeltTimeGateInfo;
};

/**
 * Nível e barra de XP usando a faixa efetiva (displayBeltIndex), alinhada com trava de tempo.
 */
export function getRankFromAthleteState(
  xp: number,
  displayBeltIndex: number,
  lastBeltPromotionAt: string | null,
  createdAt: string
): RankInfo {
  const d = Math.max(0, displayBeltIndex);
  const thresholdCurrent = getXpThresholdForBeltIndex(d);
  const thresholdNext = getXpThresholdForBeltIndex(d + 1);
  const xpVal = Math.max(0, Math.floor(xp));
  const xpCurrent = Math.max(0, xpVal - thresholdCurrent);
  const xpNext = Math.max(1, thresholdNext - thresholdCurrent);
  const beltName = getBeltName(d);

  const last = new Date(lastBeltPromotionAt ?? createdAt);
  const elapsedMs = Date.now() - last.getTime();
  const daysElapsedInBelt = Math.max(0, Math.floor(elapsedMs / 86_400_000));
  const xpAllowsNext = getBeltIndexFromXp(xpVal) > d;
  const minMonthsRequired = getMinMonthsInCurrentBeltForNextPromotion(d);
  const minDaysRequired = getMinCalendarDaysInBeltForNextPromotion(d);
  const minMs = minDaysRequired * 86_400_000;
  const waitingOnTime = xpAllowsNext && elapsedMs < minMs;

  return {
    rankIndex: d,
    rankName: beltName,
    level: d + 1,
    xpCurrent,
    xpNext,
    beltTimeGate: {
      minMonthsRequired,
      minDaysRequired,
      daysElapsedInBelt,
      waitingOnTime,
    },
  };
}

/**
 * Calcula faixa (cor), nível e progresso da barra de XP a partir do total de XP.
 * Usa o sistema de cores (Branca → Dourado N) com progressão em dobro.
 */
export function getRankFromXp(xp: number): RankInfo {
  const belt = getBeltFromXp(xp);
  return {
    rankIndex: belt.beltIndex,
    rankName: belt.beltName,
    level: belt.level,
    xpCurrent: belt.xpCurrent,
    xpNext: belt.xpNext,
  };
}

/** Retorna o nome da faixa para um índice (para listas/selects no admin). */
export function getRankNameForIndex(index: number): string {
  return getBeltName(index);
}

const GENERAL_LAST_N = 10;

/**
 * Após uma nova avaliação, recalcula as médias por dimensão e atribui XP por cada
 * target (1–10) atingido que ainda não tinha recompensa. Atualiza Athlete.xp.
 */
export async function processMissionAwards(
  supabase: SupabaseClient,
  athleteId: string
): Promise<{ xpAdded: number }> {
  const { data: modalitiesList } = await supabase
    .from("ModalityRef")
    .select("code")
    .order("sortOrder", { ascending: true });

  const modalityCodes = (modalitiesList ?? []).map((m) => (m as { code: string }).code);
  const loadedConfigs = await Promise.all(
    modalityCodes.map((code) => loadEvaluationConfigForModality(supabase, code))
  );
  const configByModality = new Map<
    string,
    { criterionToCategory: Map<string, string>; criterionToDimensionCode?: Map<string, string> }
  >();
  modalityCodes.forEach((code, i) => {
    const config = loadedConfigs[i];
    if (config) {
      configByModality.set(code, {
        criterionToCategory: getCriterionToCategory(config),
        criterionToDimensionCode: getCriterionToDimensionCode(config),
      });
    }
  });

  const { data: evalsRows } = await supabase
    .from("AthleteEvaluation")
    .select("gas, technique, strength, theory, scores, modality")
    .eq("athleteId", athleteId)
    .order("created_at", { ascending: false })
    .limit(GENERAL_LAST_N);

  const evaluations = (evalsRows ?? []).map((e) => ({
    gas: e.gas,
    technique: e.technique,
    strength: e.strength,
    theory: e.theory,
    scores: e.scores as Record<string, number> | null,
    modality: e.modality,
  }));

  if (evaluations.length === 0) return { xpAdded: 0 };

  const scores = computeGeneralPerformanceScores(
    evaluations,
    configByModality,
    GENERAL_LAST_N,
    true
  );

  const { data: existing } = await supabase
    .from("AthleteMissionAward")
    .select("dimensionCode, targetScore")
    .eq("athleteId", athleteId);

  const awarded = new Set(
    (existing ?? []).map((r) => `${r.dimensionCode}-${r.targetScore}`)
  );

  let xpAdded = 0;
  const dimensionIds = GENERAL_PERFORMANCE_AXES.map((a) => a.id);

  for (const dimId of dimensionIds) {
    const score = scores[dimId] ?? 0;
    for (let target = 1; target <= 10; target++) {
      if (score >= target && !awarded.has(`${dimId}-${target}`)) {
        const { error } = await supabase.from("AthleteMissionAward").insert({
          athleteId,
          dimensionCode: dimId,
          targetScore: target,
          xpAwarded: XP_PER_MISSION,
        });
        if (!error) {
          xpAdded += XP_PER_MISSION;
          awarded.add(`${dimId}-${target}`);
        }
      }
    }
  }

  if (xpAdded > 0) {
    const { data: athlete } = await supabase
      .from("Athlete")
      .select("xp")
      .eq("id", athleteId)
      .single();
    const currentXp = (athlete?.xp as number | null) ?? 0;
    await supabase
      .from("Athlete")
      .update({ xp: currentXp + xpAdded })
      .eq("id", athleteId);
    await syncAthleteDisplayBelt(supabase, athleteId);
  }

  return { xpAdded };
}
