import { createClient } from "@/lib/supabase/server";
import { loadAllEvaluationConfigs } from "@/lib/load-evaluation-config";
import { getCachedModalityRefs } from "@/lib/cached-reference-data";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import {
  buildPerformanceDetailFromConfigs,
  getDetailOrder,
  PERFORMANCE_DETAIL_ORDER,
} from "@/lib/performance-detail-from-config";
import type { DimensionDetail } from "@/lib/performance-detail-structure";
import { getCriterionToCategory, getCriterionToDimensionCode } from "@/lib/evaluation-config";
import {
  computeGeneralPerformanceScores,
  GENERAL_PERFORMANCE_AXES,
  type ModalityConfig,
} from "@/lib/performance-utils";
import { ComoSouAvaliadoContent } from "./ComoSouAvaliadoContent";

export const dynamic = "force-dynamic";

const EVAL_HISTORY_LIMIT = 10;

type EvalRow = {
  gas: number | null;
  technique: number | null;
  strength: number | null;
  theory: number | null;
  scores: Record<string, number> | null;
  modality: string | null;
};

function buildDimensionHistoryForEvals(
  evaluations: EvalRow[],
  configByModality: Map<string, ModalityConfig>
): Record<string, number[]> {
  const historyByDim: Record<string, number[]> = {};
  GENERAL_PERFORMANCE_AXES.forEach((a) => (historyByDim[a.id] = []));
  for (let i = evaluations.length - 1; i >= 0; i--) {
    const single = computeGeneralPerformanceScores([evaluations[i]], configByModality, 1, true);
    GENERAL_PERFORMANCE_AXES.forEach((a) => {
      if (single[a.id] != null) historyByDim[a.id].push(single[a.id]!);
    });
  }
  return historyByDim;
}

export default async function ComoSouAvaliadoPage() {
  const supabase = await createClient();
  const [modalitiesList, allConfigs, studentId] = await Promise.all([
    getCachedModalityRefs(supabase),
    loadAllEvaluationConfigs(supabase),
    getCurrentStudentId(),
  ]);
  const modalityLabels = new Map<string, string>(modalitiesList.map((m) => [m.code, m.name ?? m.code]));

  const configsForDetail: { modality: string; config: import("@/lib/evaluation-config").ModalityEvaluationConfigPayload }[] = [];
  const configByModality = new Map<string, ModalityConfig>();
  for (const mod of modalitiesList) {
    const config = allConfigs.get(mod.code);
    if (config) {
      configsForDetail.push({ modality: mod.code, config });
      configByModality.set(mod.code, {
        criterionToCategory: getCriterionToCategory(config),
        criterionToDimensionCode: getCriterionToDimensionCode(config),
      });
    }
  }

  const detailByDimension = buildPerformanceDetailFromConfigs(configsForDetail, modalityLabels);
  const detailOrder = getDetailOrder(detailByDimension);
  const standardOrder = PERFORMANCE_DETAIL_ORDER.filter((dim) => detailByDimension[dim]?.groups?.length);
  const order = detailOrder.length ? detailOrder : standardOrder;

  const modalityOptions = configsForDetail.map(({ modality }) => ({
    code: modality,
    label: modalityLabels.get(modality) ?? modality,
  }));

  const detailByModality: Record<
    string,
    { detailOrder: string[]; detailByDimension: Record<string, DimensionDetail> }
  > = {};
  for (const { modality, config } of configsForDetail) {
    const d = buildPerformanceDetailFromConfigs([{ modality, config }], modalityLabels);
    const o = getDetailOrder(d);
    const std = PERFORMANCE_DETAIL_ORDER.filter((dim) => d[dim]?.groups?.length);
    detailByModality[modality] = { detailByDimension: d, detailOrder: o.length ? o : std };
  }

  let dimensionAverages: Record<string, number> = {};
  let dimensionHistory: Record<string, number[]> = {};
  const scoresByModality: Record<
    string,
    { dimensionAverages: Record<string, number>; dimensionHistory: Record<string, number[]> }
  > = {};

  if (studentId && configByModality.size > 0) {
    const { data: athlete } = await supabase.from("Athlete").select("id").eq("studentId", studentId).single();
    if (athlete) {
      const { data: evals } = await supabase
        .from("AthleteEvaluation")
        .select("gas, technique, strength, theory, scores, modality")
        .eq("athleteId", athlete.id)
        .order("created_at", { ascending: false })
        .limit(EVAL_HISTORY_LIMIT);

      const evaluations: EvalRow[] = (evals ?? []).map((e) => ({
        gas: e.gas,
        technique: e.technique,
        strength: e.strength,
        theory: e.theory,
        scores: e.scores as Record<string, number> | null,
        modality: e.modality,
      }));

      if (evaluations.length > 0) {
        dimensionAverages = computeGeneralPerformanceScores(
          evaluations,
          configByModality,
          EVAL_HISTORY_LIMIT,
          true
        );
        dimensionHistory = buildDimensionHistoryForEvals(evaluations, configByModality);

        for (const { modality } of configsForDetail) {
          const only = evaluations.filter((e) => e.modality === modality);
          if (only.length === 0) {
            scoresByModality[modality] = { dimensionAverages: {}, dimensionHistory: {} };
            continue;
          }
          scoresByModality[modality] = {
            dimensionAverages: computeGeneralPerformanceScores(only, configByModality, EVAL_HISTORY_LIMIT, true),
            dimensionHistory: buildDimensionHistoryForEvals(only, configByModality),
          };
        }
      }
    }
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "clamp(16px, 4vw, 24px)" }}>
      {order.length === 0 ? (
        <>
          <h1 className="text-[clamp(22px,5vw,26px)] font-bold text-text-primary mb-2">
            Como sou avaliado
          </h1>
          <p className="text-text-secondary">Ainda não há critérios de avaliação configurados.</p>
        </>
      ) : (
        <ComoSouAvaliadoContent
          detailOrder={order}
          detailByDimension={detailByDimension}
          dimensionAverages={dimensionAverages}
          dimensionHistory={dimensionHistory}
          modalityOptions={modalityOptions}
          detailByModality={detailByModality}
          scoresByModality={scoresByModality}
        />
      )}
    </div>
  );
}
