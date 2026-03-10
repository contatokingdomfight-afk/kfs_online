import { createClient } from "@/lib/supabase/server";
import { loadAllEvaluationConfigs } from "@/lib/load-evaluation-config";
import { getCachedModalityRefs } from "@/lib/cached-reference-data";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import {
  buildPerformanceDetailFromConfigs,
  getDetailOrder,
  PERFORMANCE_DETAIL_ORDER,
} from "@/lib/performance-detail-from-config";
import { getCriterionToCategory, getCriterionToDimensionCode } from "@/lib/evaluation-config";
import {
  computeGeneralPerformanceScores,
  GENERAL_PERFORMANCE_AXES,
  type ModalityConfig,
} from "@/lib/performance-utils";
import { ComoSouAvaliadoContent } from "./ComoSouAvaliadoContent";

export const dynamic = "force-dynamic";

const EVAL_HISTORY_LIMIT = 10;

export default async function ComoSouAvaliadoPage() {
  const supabase = await createClient();
  const modalitiesList = await getCachedModalityRefs(supabase);
  const modalityLabels = new Map<string, string>(modalitiesList.map((m) => [m.code, m.name ?? m.code]));
  const allConfigs = await loadAllEvaluationConfigs(supabase);

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

  let dimensionAverages: Record<string, number> = {};
  let dimensionHistory: Record<string, number[]> = {};
  const studentId = await getCurrentStudentId();

  if (studentId && configByModality.size > 0) {
    const { data: athlete } = await supabase.from("Athlete").select("id").eq("studentId", studentId).single();
    if (athlete) {
      const { data: evals } = await supabase
        .from("AthleteEvaluation")
        .select("gas, technique, strength, theory, scores, modality")
        .eq("athleteId", athlete.id)
        .order("created_at", { ascending: false })
        .limit(EVAL_HISTORY_LIMIT);

      const evaluations = (evals ?? []).map((e) => ({
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
        const historyByDim: Record<string, number[]> = {};
        GENERAL_PERFORMANCE_AXES.forEach((a) => (historyByDim[a.id] = []));
        for (let i = evaluations.length - 1; i >= 0; i--) {
          const single = computeGeneralPerformanceScores(
            [evaluations[i]],
            configByModality,
            1,
            true
          );
          GENERAL_PERFORMANCE_AXES.forEach((a) => {
            if (single[a.id] != null) historyByDim[a.id].push(single[a.id]);
          });
        }
        dimensionHistory = historyByDim;
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
        />
      )}
    </div>
  );
}
