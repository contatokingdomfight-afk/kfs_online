import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { loadAllEvaluationConfigs } from "@/lib/load-evaluation-config";
import { getCachedModalityRefs } from "@/lib/cached-reference-data";
import {
  buildPerformanceDetailFromConfigs,
  getDetailOrder,
  PERFORMANCE_DETAIL_ORDER,
} from "@/lib/performance-detail-from-config";
import type { DimensionDetail, DetailGroup, DetailItem } from "@/lib/performance-detail-structure";

export const dynamic = "force-dynamic";

/** Textos explicativos por dimensão para o aluno entender o que cada pilar significa. */
const DIMENSION_INTROS: Record<string, string> = {
  tecnico:
    "Avaliação da execução técnica: postura, deslocamento, qualidade dos golpes (socos, chutes, cotoveladas, joelhadas, etc.), defesas e combinações. O treinador observa a correção dos gestos e a aplicação dos fundamentos.",
  tatico:
    "Avaliação da leitura de combate, timing, distância, estratégia e adaptação durante o treino ou luta. Inclui plano de jogo, uso de fintas e a capacidade de decidir bem sob pressão.",
  fisico:
    "Avaliação das capacidades físicas: força, explosão, velocidade, resistência (fôlego e muscular), mobilidade, equilíbrio e resistência ao impacto. Estes critérios ajudam a perceber o teu perfil físico e onde podes evoluir.",
  mental:
    "Avaliação do foco, resiliência, confiança, controlo sob pressão, tomada de decisão e disciplina. O aspecto mental é fundamental para o rendimento no treino e em competição.",
  teorico:
    "Avaliação do conhecimento das regras, conceitos técnicos e táticos, e da capacidade de relacionar a teoria com a prática e de compreender os feedbacks do treinador.",
};

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

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "clamp(16px, 4vw, 24px)" }}>
      <h1 style={{ fontSize: "clamp(22px, 5vw, 26px)", fontWeight: 700, marginBottom: 8, color: "var(--text-primary)" }}>
        Como sou avaliado
      </h1>
      <p style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)", marginBottom: 24 }}>
        O teu treinador avalia-te em várias dimensões, numa escala de 1 a 10. Aqui encontras a lista completa de critérios e o que cada um significa, para que possas perceber exatamente em que pontos estás a ser avaliados.
      </p>

      {standardOrder.length === 0 && detailOrder.length === 0 ? (
        <p style={{ color: "var(--text-secondary)" }}>Ainda não há critérios de avaliação configurados.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {(detailOrder.length ? detailOrder : standardOrder).map((dimKey) => {
            const detail = detailByDimension[dimKey];
            if (!detail?.groups?.length) return null;
            const intro = DIMENSION_INTROS[dimKey];
            return (
              <section key={dimKey} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "clamp(16px, 4vw, 24px)", backgroundColor: "var(--bg-elevated)" }}>
                <h2 style={{ fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, marginBottom: intro ? 8 : 16, color: "var(--text-primary)" }}>
                  {detail.title}
                </h2>
                {intro && (
                  <p style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.5 }}>
                    {intro}
                  </p>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {detail.groups.map((group: DetailGroup, gi: number) => (
                    <div key={gi}>
                      <h3 style={{ fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, marginBottom: 10, color: "var(--text-primary)" }}>
                        {group.title}
                      </h3>
                      {group.note && (
                        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8, fontStyle: "italic" }}>
                          {group.note}
                        </p>
                      )}
                      <ul style={{ margin: 0, paddingLeft: 20, listStyle: "disc" }}>
                        {(group.items ?? []).map((item: string | DetailItem, ii: number) => {
                          const label = typeof item === "string" ? item : (item as DetailItem).label;
                          const note = typeof item === "string" ? null : (item as DetailItem).note;
                          return (
                            <li key={ii} style={{ marginBottom: 6, fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-primary)" }}>
                              <strong>{label}</strong>
                              {note && (
                                <span style={{ display: "block", marginTop: 2, fontSize: 12, color: "var(--text-secondary)", fontWeight: 400 }}>
                                  {note}
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <p style={{ marginTop: 24, fontSize: 14, color: "var(--text-secondary)" }}>
        Todas as notas são de <strong>1 a 10</strong>. Para veres as tuas notas e a evolução, acede ao{" "}
        <Link href="/dashboard/performance" style={{ color: "var(--primary)", textDecoration: "underline" }}>
          Perfil do atleta
        </Link>
        .
      </p>
    </div>
  );
}
