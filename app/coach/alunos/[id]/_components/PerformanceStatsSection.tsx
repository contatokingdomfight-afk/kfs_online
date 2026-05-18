import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCriterionToCategory, getCriterionToDimensionCode } from "@/lib/evaluation-config";
import { loadAllEvaluationConfigs } from "@/lib/load-evaluation-config";
import {
  type ModalityConfig,
  GENERAL_PERFORMANCE_AXES,
  getAttendanceByModality,
} from "@/lib/performance-utils";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import { getCachedModalityRefs } from "@/lib/cached-reference-data";
import { buildEvaluationResultsFromAthleteEvaluations } from "@/lib/build-performance-evaluation-results";
import { normalizePhysicalFormDataJson } from "@/lib/illustrative-body-silhouette";
import { EvaluationResultsDashboard } from "@/components/evaluation-results";

const GENERAL_LAST_N = 10;

type Props = { studentId: string };

export async function PerformanceStatsSection({ studentId }: Props) {
  const result = getAdminClientOrNull();
  if (!result.client) return null;
  const supabase = result.client;

  const [athleteRes, attendanceByModality, lastAssessmentRes, modalitiesList, allConfigs] = await Promise.all([
    supabase.from("Athlete").select("id").eq("studentId", studentId).single(),
    getAttendanceByModality(supabase, studentId),
    supabase
      .from("StudentPhysicalAssessment")
      .select("assessedAt, nextDueAt, clearance, formData")
      .eq("studentId", studentId)
      .order("assessedAt", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getCachedModalityRefs(supabase),
    loadAllEvaluationConfigs(supabase),
  ]);

  const athlete = athleteRes.data;
  const lastAssessment = lastAssessmentRes.data ?? null;
  const modalityLabelsMap = new Map<string, string>(modalitiesList.map((m) => [m.code, m.name ?? m.code]));
  const modalityLabelsRecord = Object.fromEntries(modalityLabelsMap);

  const configsForDetail: { modality: string; config: import("@/lib/evaluation-config").ModalityEvaluationConfigPayload }[] = [];
  const configByModality = new Map<string, ModalityConfig>();
  for (const m of modalitiesList) {
    const config = allConfigs.get(m.code);
    if (config) {
      configByModality.set(m.code, {
        criterionToCategory: getCriterionToCategory(config),
        criterionToDimensionCode: getCriterionToDimensionCode(config),
      });
      configsForDetail.push({ modality: m.code, config });
    }
  }

  let bundle: ReturnType<typeof buildEvaluationResultsFromAthleteEvaluations> = null;
  let lastEvalDate: string | null = null;

  if (athlete) {
    const { data: evalsRows } = await supabase
      .from("AthleteEvaluation")
      .select("gas, technique, strength, theory, scores, modality, created_at")
      .eq("athleteId", athlete.id)
      .order("created_at", { ascending: false })
      .limit(GENERAL_LAST_N);

    const normalizedPhysicalForm = normalizePhysicalFormDataJson(lastAssessment?.formData ?? null);
    const rows = evalsRows ?? [];
    const aggregateRows = rows.map((e) => ({
      gas: e.gas,
      technique: e.technique,
      strength: e.strength,
      theory: e.theory,
      scores: e.scores as Record<string, number> | null,
      modality: (e.modality as string | null) ?? null,
    }));

    if (aggregateRows.length > 0) {
      lastEvalDate = (rows[0] as { created_at?: string }).created_at ?? null;
      bundle = buildEvaluationResultsFromAthleteEvaluations(
        aggregateRows,
        configsForDetail,
        configByModality,
        { normalizedPhysicalForm, generalLastN: GENERAL_LAST_N }
      );
    }
  }

  return (
    <section
      className="card rounded-2xl border border-border bg-bg-secondary p-4 sm:p-5 shadow-md"
      style={{ marginTop: "clamp(24px, 6vw, 32px)" }}
    >
      <h2 className="m-0 mb-3 text-lg sm:text-xl font-semibold text-text-primary">Estatísticas de performance</h2>
      {bundle ? (
        <>
          {lastEvalDate && (
            <p className="m-0 mb-2 text-sm font-medium text-text-primary">
              Última avaliação:{" "}
              {new Date(lastEvalDate).toLocaleDateString("pt-PT", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          )}
          <p className="m-0 mb-4 text-sm text-text-secondary">
            Média das últimas {GENERAL_LAST_N} avaliações (escala 1–10). O mesmo resumo que o aluno vê no painel de
            performance.
          </p>
          <EvaluationResultsDashboard
            dimensionScores={bundle.evaluationResultsData.dimensionScores}
            criterionScores={bundle.evaluationResultsData.criterionScores}
            overallScore={bundle.evaluationResultsData.overallScore}
            maxScore={10}
            axes={[...GENERAL_PERFORMANCE_AXES]}
            scoresForRadar={bundle.evaluationResultsData.scoresForRadar}
            modalityLabels={modalityLabelsRecord}
            scoresByModality={bundle.scoresByModality}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/coach/alunos/${studentId}/performance`} className="btn btn-secondary no-underline">
              Ver mais detalhes
            </Link>
            <Link
              href={`/coach/alunos/${studentId}/avaliacoes`}
              className="btn no-underline border border-border bg-bg"
            >
              Histórico de avaliações
            </Link>
          </div>
        </>
      ) : (
        <p className="m-0 text-sm text-text-secondary">
          Ainda não há avaliações registadas para este aluno. As avaliações feitas pelo coach nas aulas aparecem aqui.
        </p>
      )}
      {Object.keys(attendanceByModality).length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <p className="m-0 mb-2 text-sm font-semibold text-text-primary">Presenças confirmadas por modalidade</p>
          <ul className="m-0 list-disc pl-5 text-sm text-text-secondary leading-relaxed">
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
