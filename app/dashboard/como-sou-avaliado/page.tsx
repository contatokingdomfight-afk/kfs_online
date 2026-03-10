import { createClient } from "@/lib/supabase/server";
import { loadAllEvaluationConfigs } from "@/lib/load-evaluation-config";
import { getCachedModalityRefs } from "@/lib/cached-reference-data";
import {
  buildPerformanceDetailFromConfigs,
  getDetailOrder,
  PERFORMANCE_DETAIL_ORDER,
} from "@/lib/performance-detail-from-config";
import { ComoSouAvaliadoContent } from "./ComoSouAvaliadoContent";

export const dynamic = "force-dynamic";

export default async function ComoSouAvaliadoPage() {
  const supabase = await createClient();
  const modalitiesList = await getCachedModalityRefs(supabase);
  const modalityLabels = new Map<string, string>(modalitiesList.map((m) => [m.code, m.name ?? m.code]));
  const allConfigs = await loadAllEvaluationConfigs(supabase);

  const configsForDetail: { modality: string; config: import("@/lib/evaluation-config").ModalityEvaluationConfigPayload }[] = [];
  for (const mod of modalitiesList) {
    const config = allConfigs.get(mod.code);
    if (config) configsForDetail.push({ modality: mod.code, config });
  }

  const detailByDimension = buildPerformanceDetailFromConfigs(configsForDetail, modalityLabels);
  const detailOrder = getDetailOrder(detailByDimension);
  const standardOrder = PERFORMANCE_DETAIL_ORDER.filter((dim) => detailByDimension[dim]?.groups?.length);
  const order = detailOrder.length ? detailOrder : standardOrder;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "clamp(16px, 4vw, 24px)" }}>
      {order.length === 0 ? (
        <>
          <h1 style={{ fontSize: "clamp(22px, 5vw, 26px)", fontWeight: 700, marginBottom: 8, color: "var(--text-primary)" }}>
            Como sou avaliado
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>Ainda não há critérios de avaliação configurados.</p>
        </>
      ) : (
        <ComoSouAvaliadoContent detailOrder={order} detailByDimension={detailByDimension} />
      )}
    </div>
  );
}
