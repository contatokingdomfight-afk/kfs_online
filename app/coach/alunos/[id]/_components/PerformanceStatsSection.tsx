import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCriterionToCategory, getCriterionToDimensionCode } from "@/lib/evaluation-config";
import { loadAllEvaluationConfigs } from "@/lib/load-evaluation-config";
import {
  type ModalityConfig,
  GENERAL_PERFORMANCE_AXES,
  computeGeneralPerformanceScores,
  getAttendanceByModality,
  getFisicoScoreFromPhysicalAssessment,
  mergePhysicalAssessmentIntoRadar,
} from "@/lib/performance-utils";
import { RadarStats } from "@/components/fighter/RadarStatsDynamic";
import { MODALITY_LABELS } from "@/lib/lesson-utils";

const GENERAL_LAST_N = 10;

type Props = { studentId: string };

export async function PerformanceStatsSection({ studentId }: Props) {
  const result = getAdminClientOrNull();
  if (!result.client) return null;
  const supabase = result.client;

  const [athleteRes, attendanceByModality, lastAssessmentRes, allConfigs] = await Promise.all([
    supabase.from("Athlete").select("id").eq("studentId", studentId).single(),
    getAttendanceByModality(supabase, studentId),
    supabase
      .from("StudentPhysicalAssessment")
      .select("assessedAt, nextDueAt, clearance, formData")
      .eq("studentId", studentId)
      .order("assessedAt", { ascending: false })
      .limit(1)
      .maybeSingle(),
    loadAllEvaluationConfigs(supabase),
  ]);

  const athlete = athleteRes.data;
  const lastAssessment = lastAssessmentRes.data ?? null;

  let generalPerformanceScores: Record<string, number> | null = null;
  let lastEvalDate: string | null = null;

  if (athlete) {
    const { data: evalsRows } = await supabase
      .from("AthleteEvaluation")
      .select("gas, technique, strength, theory, scores, modality, created_at")
      .eq("athleteId", athlete.id)
      .order("created_at", { ascending: false })
      .limit(GENERAL_LAST_N);

    const evaluations = (evalsRows ?? []).map((e) => ({
      gas: e.gas,
      technique: e.technique,
      strength: e.strength,
      theory: e.theory,
      scores: e.scores as Record<string, number> | null,
      modality: e.modality,
      created_at: (e as { created_at?: string }).created_at,
    }));

    if (evaluations.length > 0) {
      lastEvalDate = evaluations[0].created_at ?? null;
      const configByModality = new Map<string, ModalityConfig>();
      for (const mod of ["MUAY_THAI", "BOXING", "KICKBOXING"] as const) {
        const config = allConfigs.get(mod);
        if (config)
          configByModality.set(mod, {
            criterionToCategory: getCriterionToCategory(config),
            criterionToDimensionCode: getCriterionToDimensionCode(config),
          });
      }
      generalPerformanceScores = computeGeneralPerformanceScores(evaluations, configByModality, GENERAL_LAST_N, true);
    }
  }

  if (lastAssessment?.formData && generalPerformanceScores) {
    generalPerformanceScores = mergePhysicalAssessmentIntoRadar(generalPerformanceScores, lastAssessment.formData);
  } else if (lastAssessment?.formData && !generalPerformanceScores) {
    const fisico = getFisicoScoreFromPhysicalAssessment(lastAssessment.formData);
    if (fisico != null) {
      generalPerformanceScores = {
        tecnico: 1,
        tatico: 1,
        fisico,
        mental: 1,
        teorico: 1,
      };
    }
  }

  const hasPerformance = generalPerformanceScores && Object.keys(generalPerformanceScores).length > 0;

  return (
    <section
      className="card"
      style={{
        marginTop: "clamp(24px, 6vw, 32px)",
        padding: "clamp(20px, 5vw, 24px)",
      }}
    >
      <h2 style={{ margin: "0 0 12px 0", fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, color: "var(--text-primary)" }}>
        Estatísticas de performance
      </h2>
      {hasPerformance && generalPerformanceScores ? (
        <>
          {lastEvalDate && (
            <p style={{ margin: "0 0 8px 0", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-primary)", fontWeight: 500 }}>
              Última avaliação: {new Date(lastEvalDate).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
          )}
          <p style={{ margin: "0 0 16px 0", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
            Média das últimas {GENERAL_LAST_N} avaliações (escala 1–10).
          </p>
          <RadarStats
            scores={generalPerformanceScores}
            axes={[...GENERAL_PERFORMANCE_AXES]}
            maxScore={10}
            embedded
          />
          <div style={{ marginTop: "clamp(12px, 3vw, 16px)", display: "flex", flexWrap: "wrap", gap: 10 }}>
            <Link href={`/coach/alunos/${studentId}/performance`} className="btn btn-secondary" style={{ textDecoration: "none" }}>
              Ver mais detalhes
            </Link>
            <Link
              href={`/coach/alunos/${studentId}/avaliacoes`}
              className="btn"
              style={{ textDecoration: "none", background: "var(--bg)", border: "1px solid var(--border)" }}
            >
              Histórico de avaliações
            </Link>
          </div>
        </>
      ) : (
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
          Ainda não há avaliações registadas para este aluno. As avaliações feitas pelo coach nas aulas aparecem aqui.
        </p>
      )}
      {Object.keys(attendanceByModality).length > 0 && (
        <div style={{ marginTop: "clamp(16px, 4vw, 20px)", paddingTop: "clamp(12px, 3vw, 16px)", borderTop: "1px solid var(--border)" }}>
          <p style={{ margin: "0 0 8px 0", fontSize: "clamp(13px, 3.2vw, 15px)", fontWeight: 600, color: "var(--text-primary)" }}>
            Presenças confirmadas por modalidade
          </p>
          <ul style={{ margin: 0, paddingLeft: "1.2em", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)", lineHeight: 1.6 }}>
            {Object.entries(attendanceByModality)
              .sort((a, b) => b[1] - a[1])
              .map(([mod, count]) => (
                <li key={mod}>
                  {MODALITY_LABELS[mod] ?? mod}: {count}
                </li>
              ))}
          </ul>
        </div>
      )}
    </section>
  );
}
