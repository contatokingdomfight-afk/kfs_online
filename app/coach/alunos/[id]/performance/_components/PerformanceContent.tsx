import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCriterionToCategory, getCriterionToDimensionCode } from "@/lib/evaluation-config";
import { loadAllEvaluationConfigs } from "@/lib/load-evaluation-config";
import {
  type ModalityConfig,
  GENERAL_PERFORMANCE_AXES,
  enrichScoresForDetail,
  getFisicoScoreFromPhysicalAssessment,
} from "@/lib/performance-utils";
import { buildEvaluationResultsFromAthleteEvaluations } from "@/lib/build-performance-evaluation-results";
import { normalizePhysicalFormDataJson } from "@/lib/illustrative-body-silhouette";
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
import { getRankFromAthleteState, type BeltTimeGateInfo } from "@/lib/xp-missions";
import { syncAthleteDisplayBelt } from "@/lib/sync-athlete-display-belt";
import { getApplicableMissionTemplates } from "@/lib/missions";
import { getCachedModalityRefs } from "@/lib/cached-reference-data";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import { resolveCoachFeedbackForStudentView } from "@/lib/resolve-coach-feedback";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { buildPhysicalAvatarCarouselForStudentView } from "@/lib/build-performance-physical-carousel";

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
  let evaluationResultsData: {
    dimensionScores: import("@/lib/evaluation-results-data").DimensionScore[];
    criterionScores: import("@/lib/evaluation-results-data").CriterionScoreItem[];
    overallScore: number;
    scoresForRadar: Record<string, number>;
  } | null = null;
  let scoresByModality: Record<string, Record<string, number>> = {};
  let rankInfo: {
    level: number;
    rankIndex: number;
    xpCurrent: number;
    xpNext: number;
    beltTimeGate?: BeltTimeGateInfo;
  } | null = null;
  let customMissions: { id: string; name: string; description: string | null; xpReward: number }[] = [];
  let primaryModalityLabel: string | null = null;
  let physicalAssessmentDue = false;
  let lastPhysicalAssessment: { assessedAt: string; nextDueAt: string | null } | null = null;
  let coachFeedback: string | null = null;
  let coachName: string | null = null;
  let omitLastEvaluationNoteBody = false;
  let lastEvaluation: { coachName: string; date: string; note: string | null } | null = null;
  let lastPhysSnapshot: { assessedAt: string; nextDueAt: string | null; formData?: unknown } | null = null;

  const { data: athlete } = await supabase.from("Athlete").select("id, xp, createdAt").eq("studentId", studentId).single();

  if (athlete) {
    const synced = await syncAthleteDisplayBelt(supabase, athlete.id);
    if (synced) {
      const rank = getRankFromAthleteState(
        synced.xp,
        synced.displayBeltIndex,
        synced.lastBeltPromotionAt,
        synced.createdAt
      );
      rankInfo = {
        level: rank.level,
        rankIndex: rank.rankIndex,
        xpCurrent: rank.xpCurrent,
        xpNext: rank.xpNext,
        beltTimeGate: rank.beltTimeGate,
      };
    }

    const primaryModality = (student.primaryModality as string | null) ?? null;
    primaryModalityLabel = primaryModality ? (modalityLabels.get(primaryModality) ?? MODALITY_LABELS[primaryModality] ?? primaryModality) : "Todas as modalidades";

    const athleteXpForMissions = synced?.xp ?? ((athlete.xp as number | null) ?? 0);

    const [missionsData, latestCommentRes, lastPhysRes, evalsRes] = await Promise.all([
      getApplicableMissionTemplates(supabase, athlete.id, athleteXpForMissions, primaryModality, synced?.displayBeltIndex),
      supabase
        .from("Comment")
        .select("content, authorCoachId")
        .eq("targetType", "ATHLETE")
        .eq("targetId", athlete.id)
        .eq("visibility", "SHARED")
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
    let sharedCommentContent: string | null = null;
    let sharedCommentCoachName: string | null = null;
    if (latestComment?.content) {
      sharedCommentContent = latestComment.content;
      const { data: coach } = await supabase.from("Coach").select("userId").eq("id", latestComment.authorCoachId).single();
      if (coach) {
        const { data: user } = await supabase.from("User").select("name").eq("id", coach.userId).single();
        sharedCommentCoachName = user?.name ?? "Treinador";
      } else {
        sharedCommentCoachName = "Treinador";
      }
    }

    const lastPhys = lastPhysRes.data;
    lastPhysSnapshot = lastPhys ?? null;
    lastPhysicalAssessment = lastPhys ? { assessedAt: lastPhys.assessedAt, nextDueAt: lastPhys.nextDueAt } : null;
    const today = new Date().toISOString().slice(0, 10);
    physicalAssessmentDue =
      !lastPhysicalAssessment || (lastPhysicalAssessment.nextDueAt != null && lastPhysicalAssessment.nextDueAt <= today);

    const evalsRows = evalsRes.data ?? [];
    const normalizedPhysicalForm = normalizePhysicalFormDataJson(lastPhys?.formData ?? null);
    const aggregateRows = evalsRows.map((e) => ({
      gas: e.gas,
      technique: e.technique,
      strength: e.strength,
      theory: e.theory,
      scores: e.scores as Record<string, number> | null,
      modality: (e.modality as string | null) ?? null,
    }));

    if (aggregateRows.length > 0) {
      const bundle = buildEvaluationResultsFromAthleteEvaluations(
        aggregateRows,
        configsForDetail,
        configByModality,
        { normalizedPhysicalForm, generalLastN: GENERAL_LAST_N }
      );
      if (bundle) {
        generalPerformanceScores = bundle.generalPerformanceScores;
        scoresByModality = bundle.scoresByModality;
        evaluationResultsData = bundle.evaluationResultsData;
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
    if (!generalPerformanceScores && normalizedPhysicalForm) {
      const fisico = getFisicoScoreFromPhysicalAssessment(normalizedPhysicalForm);
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

    const feedbackResolved = resolveCoachFeedbackForStudentView({
      sharedCommentContent,
      sharedCommentCoachName,
      lastEvaluationCoachName: lastEvaluation?.coachName,
      lastEvaluationNote: lastEvaluation?.note,
    });
    coachFeedback = feedbackResolved.quote;
    coachName = feedbackResolved.coachName;
    omitLastEvaluationNoteBody = feedbackResolved.hideNoteInLastEvaluationSection;
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

  const locale = await getLocaleFromCookies();
  const tPerf = getTranslations(locale as "pt" | "en");
  const { data: coachStudentProfile } = await supabase
    .from("StudentProfile")
    .select("heightCm, weightKg")
    .eq("studentId", studentId)
    .maybeSingle();
  const physicalAvatarCarousel = buildPhysicalAvatarCarouselForStudentView(tPerf, lastPhysSnapshot, {
    perspective: "coach",
    hasPhysicalAssessmentFromPlatform: lastPhysSnapshot != null,
    profileBodyMetrics: {
      heightCm: coachStudentProfile?.heightCm != null ? Number(coachStudentProfile.heightCm) : null,
      weightKg: coachStudentProfile?.weightKg != null ? Number(coachStudentProfile.weightKg) : null,
    },
    locale: locale as "pt" | "en",
    inviteScheduleHref: `/coach/alunos/${studentId}/avaliacao-fisica`,
  });

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
      beltTimeGate={rankInfo?.beltTimeGate}
      customMissions={customMissions}
      primaryModalityLabel={primaryModalityLabel}
      evaluationResultsData={evaluationResultsData ?? undefined}
      scoresByModality={Object.keys(scoresByModality).length > 0 ? scoresByModality : undefined}
      modalityLabels={Object.fromEntries(modalityLabels)}
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
      omitLastEvaluationNoteBody={omitLastEvaluationNoteBody}
      lastEvaluation={lastEvaluation ?? undefined}
      evaluationsHistoryHref={`/coach/alunos/${studentId}/avaliacoes`}
      physicalAvatarCarousel={physicalAvatarCarousel}
      locale={locale as "pt" | "en"}
    />
  );
}
