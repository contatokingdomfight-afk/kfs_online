import type { SupabaseClient } from "@supabase/supabase-js";
import { getCachedModalityRefs } from "@/lib/cached-reference-data";
import { getCriterionToCategory, getCriterionToDimensionCode } from "@/lib/evaluation-config";
import { loadAllEvaluationConfigs } from "@/lib/load-evaluation-config";
import { normalizePhysicalFormDataJson } from "@/lib/illustrative-body-silhouette";
import { getApplicableMissionTemplates } from "@/lib/missions";
import {
  type ModalityConfig,
  computeGeneralPerformanceScores,
  mergePhysicalAssessmentIntoRadar,
  GENERAL_PERFORMANCE_AXES,
} from "@/lib/performance-utils";
import { buildMissionsFromScores } from "@/lib/fighter-missions";

const GENERAL_LAST_N = 10;

export type WhatIsNewMission = {
  id: string;
  name: string;
  description: string | null;
  xpReward: number;
};

/**
 * Próxima missão a mostrar em «O que há de novo?» — mesma prioridade que `PerformanceFighterDashboard`:
 * avaliação física (se em falta / a renovar) → metas do radar → modelos `MissionTemplate`.
 */
export async function getWhatIsNewNextMission(
  supabase: SupabaseClient,
  params: {
    studentId: string;
    athleteId: string;
    athleteXp: number;
    primaryModality: string | null;
    displayBeltIndex: number;
  }
): Promise<WhatIsNewMission | null> {
  const { studentId, athleteId, athleteXp, primaryModality, displayBeltIndex } = params;
  const today = new Date().toISOString().slice(0, 10);

  const { data: physRow } = await supabase
    .from("StudentPhysicalAssessment")
    .select("assessedAt, nextDueAt, formData")
    .eq("studentId", studentId)
    .order("assessedAt", { ascending: false })
    .limit(1);

  const lastPhys = physRow?.[0] ?? null;
  const lastPhysicalAssessment = lastPhys
    ? { assessedAt: lastPhys.assessedAt, nextDueAt: lastPhys.nextDueAt }
    : null;
  const physicalAssessmentDue =
    !lastPhysicalAssessment ||
    (lastPhysicalAssessment.nextDueAt != null && lastPhysicalAssessment.nextDueAt <= today);

  if (physicalAssessmentDue) {
    return {
      id: "physical-assessment",
      name: lastPhysicalAssessment
        ? "Renovar avaliação física (obrigatório a cada 6 meses)"
        : "Realizar avaliação física",
      description: "Solicita ao teu instrutor a ficha de anamnese e avaliação física.",
      xpReward: 0,
    };
  }

  const modalitiesList = await getCachedModalityRefs(supabase);
  const allConfigs = await loadAllEvaluationConfigs(supabase);
  const configByModality = new Map<string, ModalityConfig>();
  for (const mod of modalitiesList) {
    const config = allConfigs.get(mod.code);
    if (config) {
      configByModality.set(mod.code, {
        criterionToCategory: getCriterionToCategory(config),
        criterionToDimensionCode: getCriterionToDimensionCode(config),
      });
    }
  }

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

  let generalPerformanceScores =
    evaluations.length > 0
      ? computeGeneralPerformanceScores(evaluations, configByModality, GENERAL_LAST_N, true)
      : null;

  const normalizedPhysicalForm = normalizePhysicalFormDataJson(lastPhys?.formData ?? null);
  if (generalPerformanceScores && normalizedPhysicalForm) {
    generalPerformanceScores = mergePhysicalAssessmentIntoRadar(
      generalPerformanceScores,
      normalizedPhysicalForm
    );
  }

  if (generalPerformanceScores) {
    const systemMissions = buildMissionsFromScores(
      generalPerformanceScores,
      [...GENERAL_PERFORMANCE_AXES],
      10
    );
    if (systemMissions.length > 0) {
      const s = systemMissions[0];
      return { id: s.id, name: s.target, description: null, xpReward: s.xpReward };
    }
  }

  const templates = await getApplicableMissionTemplates(
    supabase,
    athleteId,
    athleteXp,
    primaryModality,
    displayBeltIndex
  );
  if (templates.length > 0) {
    const m = templates[0];
    return { id: m.id, name: m.name, description: m.description, xpReward: m.xpReward };
  }

  return null;
}
