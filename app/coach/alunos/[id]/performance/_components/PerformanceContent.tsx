import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCriterionToCategory, getCriterionToDimensionCode } from "@/lib/evaluation-config";
import { loadAllEvaluationConfigs } from "@/lib/load-evaluation-config";
import {
  type ModalityConfig,
  GENERAL_PERFORMANCE_AXES,
  computeGeneralPerformanceScores,
  enrichScoresForDetail,
  getFisicoScoreFromPhysicalAssessment,
  mergePhysicalAssessmentIntoRadar,
} from "@/lib/performance-utils";
import { PerformanceFighterDashboard } from "@/components/fighter/PerformanceFighterDashboard";
import {
  PERFORMANCE_DETAIL_BY_DIMENSION,
  PERFORMANCE_DETAIL_ORDER,
} from "@/lib/performance-detail-structure";
import {
  buildPerformanceDetailFromConfigs,
  getDetailOrder,
  groupDetailByGeneralDimension,
} from "@/lib/performance-detail-from-config";
import { getRankFromXp } from "@/lib/xp-missions";
import { getApplicableMissionTemplates } from "@/lib/missions";
import { getCachedModalityRefs } from "@/lib/cached-reference-data";
import { MODALITY_LABELS } from "@/lib/lesson-utils";

const GENERAL_LAST_N = 10;

type Props = { studentId: string };

export async function PerformanceContent({ studentId }: Props) {
  const result = getAdminClientOrNull();
  if (!result.client) return null;
  const supabase = result.client;

  const { data: student } = await supabase
    .from("Student")
    .select("id, userId, primaryModality")
    .eq("id", studentId)
    .single();

  if (!student) return null;

  const [modalitiesList, allConfigs] = await Promise.all([
    getCachedModalityRefs(supabase),
    loadAllEvaluationConfigs(supabase),
  ]);

  const modalityLabels = new Map<string, string>(modalitiesList.map((m) => [m.code, m.name ?? m.code]));

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

  let generalPerformanceScores: Record<string, number> | null = null;
  let rankInfo: { level: number; rankIndex: number; xpCurrent: number; xpNext: number } | null = null;
  let customMissions: { id: string; name: string; description: string | null; xpReward: number }[] = [];
  let primaryModalityLabel: string | null = null;
  let physicalAssessmentDue = false;
  let lastPhysicalAssessment: { assessedAt: string; nextDueAt: string | null } | null = null;
  let coachFeedback: string | null = null;
  let coachName: string | null = null;
  let lastEvaluation: { coachName: string; date: string; note: string | null } | null = null;

  const { data: athlete } = await supabase.from("Athlete").select("id, xp").eq("studentId", studentId).single();

  if (athlete) {
    const xp = (athlete.xp as number | null) ?? 0;
    const rank = getRankFromXp(xp);
    rankInfo = { level: rank.level, rankIndex: rank.rankIndex, xpCurrent: rank.xpCurrent, xpNext: rank.xpNext };

    const primaryModality = (student.primaryModality as string | null) ?? null;
    primaryModalityLabel = primaryModality ? (modalityLabels.get(primaryModality) ?? MODALITY_LABELS[primaryModality] ?? primaryModality) : "Todas as modalidades";

    const [missionsData, latestCommentRes, lastPhysRes, evalsRes] = await Promise.all([
      getApplicableMissionTemplates(supabase, athlete.id, xp, primaryModality),
      supabase
        .from("Comment")
        .select("content, authorCoachId")
        .eq("targetType", "ATHLETE")
        .eq("targetId", athlete.id)
        .order("createdAt", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("StudentPhysicalAssessment")
        .select("assessedAt, nextDueAt, formData")
        .eq("studentId", studentId)
        .order("assessedAt", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("AthleteEvaluation")
        .select("gas, technique, strength, theory, scores, modality, coachId, note, created_at")
        .eq("athleteId", athlete.id)
        .order("created_at", { ascending: false })
        .limit(GENERAL_LAST_N),
    ]);

    customMissions = missionsData.map((t) => ({ id: t.id, name: t.name, description: t.description, xpReward: t.xpReward }));

    const latestComment = latestCommentRes.data;
    if (latestComment?.content) {
      coachFeedback = latestComment.content;
      const { data: coach } = await supabase.from("Coach").select("userId").eq("id", latestComment.authorCoachId).single();
      if (coach) {
        const { data: user } = await supabase.from("User").select("name").eq("id", coach.userId).single();
        coachName = user?.name ?? "Treinador";
      } else {
        coachName = "Treinador";
      }
    }

    const lastPhys = lastPhysRes.data;
    lastPhysicalAssessment = lastPhys ? { assessedAt: lastPhys.assessedAt, nextDueAt: lastPhys.nextDueAt } : null;
    const today = new Date().toISOString().slice(0, 10);
    physicalAssessmentDue =
      !lastPhysicalAssessment || (lastPhysicalAssessment.nextDueAt != null && lastPhysicalAssessment.nextDueAt <= today);

    const evalsRows = evalsRes.data ?? [];
    const evaluations = evalsRows.map((e) => ({
      gas: e.gas,
      technique: e.technique,
      strength: e.strength,
      theory: e.theory,
      scores: e.scores as Record<string, number> | null,
      modality: e.modality,
    }));

    if (evaluations.length > 0) {
      generalPerformanceScores = computeGeneralPerformanceScores(evaluations, configByModality, GENERAL_LAST_N, true);
      if (lastPhys?.formData && generalPerformanceScores) {
        generalPerformanceScores = mergePhysicalAssessmentIntoRadar(generalPerformanceScores, lastPhys.formData);
      }
      const latestEval = evalsRows[0];
      if (latestEval?.coachId) {
        let evalCoachName = "Treinador";
        const { data: coachRow } = await supabase.from("Coach").select("userId").eq("id", latestEval.coachId).single();
        if (coachRow) {
          const { data: userRow } = await supabase.from("User").select("name").eq("id", coachRow.userId).single();
          evalCoachName = userRow?.name ?? evalCoachName;
        }
        const created = latestEval.created_at;
        const dateStr = created ? new Date(created).toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" }) : "";
        lastEvaluation = {
          coachName: evalCoachName,
          date: dateStr,
          note: (latestEval.note as string | null) ?? null,
        };
      }
    }
    if (!generalPerformanceScores && lastPhys?.formData) {
      const fisico = getFisicoScoreFromPhysicalAssessment(lastPhys.formData);
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
  }

  const detailByDimension = buildPerformanceDetailFromConfigs(configsForDetail, modalityLabels);
  const useStaticDetail = Object.keys(detailByDimension).length === 0;
  const detailSource = useStaticDetail ? PERFORMANCE_DETAIL_BY_DIMENSION : detailByDimension;
  const detailOrder = useStaticDetail ? [...PERFORMANCE_DETAIL_ORDER] : getDetailOrder(detailByDimension);
  const groupedSource = groupDetailByGeneralDimension(detailSource, detailOrder);
  const groupedOrder = getDetailOrder(groupedSource);

  const hasScores = generalPerformanceScores && Object.keys(generalPerformanceScores).length > 0;

  if (!hasScores) {
    return (
      <div className="max-w-[min(720px,100%)] mx-auto">
        <div className="rounded-2xl bg-bg-secondary border border-border p-6 shadow-md">
          <h1 className="text-xl font-bold text-text-primary mb-2">Perfil do Atleta</h1>
          <p className="text-base text-text-secondary mb-4">
            Ainda não há avaliações registadas para este aluno. As avaliações feitas nas aulas aparecem aqui com o mesmo perfil gamificado (faixas, XP, radar, missões) que o aluno vê.
          </p>
          <Link
            href={`/coach/alunos/${studentId}`}
            className="btn btn-primary inline-block no-underline"
          >
            ← Voltar ao perfil do aluno
          </Link>
        </div>
      </div>
    );
  }

  const scoresForDetail = enrichScoresForDetail(generalPerformanceScores!, groupedOrder);

  return (
    <PerformanceFighterDashboard
      backHref={`/coach/alunos/${studentId}`}
      backLabel="Voltar ao perfil do aluno"
      scores={scoresForDetail}
      detailOrder={groupedOrder}
      detailSource={groupedSource}
      axes={[...GENERAL_PERFORMANCE_AXES]}
      maxScore={10}
      level={rankInfo?.level}
      rankIndex={rankInfo?.rankIndex}
      xpCurrent={rankInfo?.xpCurrent}
      xpNext={rankInfo?.xpNext}
      customMissions={customMissions}
      primaryModalityLabel={primaryModalityLabel}
      physicalAssessmentMission={
        physicalAssessmentDue
          ? {
              id: "physical-assessment",
              name: lastPhysicalAssessment
                ? "Renovar avaliação física (obrigatório a cada 6 meses)"
                : "Realizar avaliação física",
              description: "Solicita ao teu instrutor a ficha de anamnese e avaliação física.",
              xpReward: 0,
            }
          : null
      }
      coachFeedback={coachFeedback ?? undefined}
      coachName={coachName ?? undefined}
      lastEvaluation={lastEvaluation ?? undefined}
      evaluationsHistoryHref={`/coach/alunos/${studentId}/avaliacoes`}
    />
  );
}
