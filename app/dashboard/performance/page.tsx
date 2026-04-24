import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePlan } from "@/lib/require-plan";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations, type MessageKey } from "@/lib/i18n";
import { getPlanAccess } from "@/lib/plan-access";
import { aggregateCheckInWellness } from "@/lib/check-in-wellness-aggregates";
import {
  CheckInWellnessSection,
  type CheckInWellnessCopy,
} from "@/components/fighter/CheckInWellnessSection";
import type { CheckInWellnessAggregates } from "@/lib/check-in-wellness-aggregates";
import { type ModalityConfig, GENERAL_PERFORMANCE_AXES, computeGeneralPerformanceScores, computePerformanceScoresByModality, enrichScoresForDetail, getFisicoScoreFromPhysicalAssessment, mergePhysicalAssessmentIntoRadar } from "@/lib/performance-utils";
import { getCriterionToCategory, getCriterionToDimensionCode } from "@/lib/evaluation-config";
import { loadAllEvaluationConfigs } from "@/lib/load-evaluation-config";
import { PerformanceFighterDashboard } from "@/components/fighter/PerformanceFighterDashboard";
import { buildPhysicalAvatarCarouselForStudentView } from "@/lib/build-performance-physical-carousel";
import { hasIllustrativeAnthropometry, normalizePhysicalFormDataJson } from "@/lib/illustrative-body-silhouette";
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
import { getAchievementUnlockContext, getAchievementsWithStatus } from "@/lib/achievements";
import type { AchievementWithStatus } from "@/lib/achievements";
import {
  buildCriterionScores,
  buildCriterionScoresFromDimensionScores,
  type DimensionScore,
  type CriterionScoreItem,
} from "@/lib/evaluation-results-data";
import { resolveCoachFeedbackForStudentView } from "@/lib/resolve-coach-feedback";

const GENERAL_LAST_N = 10;
const LAST_N_PER_MODALITY = 5;

export const dynamic = "force-dynamic";

function buildWellnessCopy(t: (key: MessageKey) => string, agg: CheckInWellnessAggregates): CheckInWellnessCopy {
  return {
    title: t("perfWellnessTitle"),
    intro: t("perfWellnessIntro"),
    sample: t("perfWellnessSample").replace("{count}", String(agg.count)),
    sleepH: t("perfWellnessSleepH"),
    sleepQ: t("perfWellnessSleepQ"),
    hydration: t("perfWellnessHydration"),
    stress: t("perfWellnessStress"),
    fatigue: t("perfWellnessFatigue"),
    scaleHint: t("perfWellnessScaleHint"),
    hydrationHint: t("perfWellnessHydrationHint"),
    zonesTitle: t("perfWellnessZonesTitle"),
    zoneGreen: t("perfWellnessZoneGreen"),
    zoneYellow: t("perfWellnessZoneYellow"),
    zoneRed: t("perfWellnessZoneRed"),
    statusNormal: t("perfWellnessStatusNormal"),
    statusAttention: t("perfWellnessStatusAttention"),
    statusLower: t("perfWellnessStatusLower"),
    statusHigher: t("perfWellnessStatusHigher"),
    abbrSleepH: t("perfWellnessAbbrSleepH"),
    abbrSleepQ: t("perfWellnessAbbrSleepQ"),
    abbrHydration: t("perfWellnessAbbrHydration"),
    abbrStress: t("perfWellnessAbbrStress"),
    abbrFatigue: t("perfWellnessAbbrFatigue"),
  };
}

export default async function DashboardPerformancePage() {
  await requirePlan();
  const supabase = await createClient();
  const studentId = await getCurrentStudentId();
  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");
  const planAccess = await getPlanAccess(supabase, studentId);

  let checkInWellness:
    | { data: CheckInWellnessAggregates; copy: CheckInWellnessCopy }
    | undefined;
  if (studentId) {
    const { data: wellnessRows } = await supabase
      .from("PreLessonWellness")
      .select("sleepHours, sleepQuality, hydrationOk, stress, fatigue, wellnessZone")
      .eq("studentId", studentId)
      .limit(500);
    const agg = aggregateCheckInWellness(wellnessRows ?? []);
    if (agg) {
      checkInWellness = { data: agg, copy: buildWellnessCopy(t, agg) };
    }
  }
  if (studentId && !planAccess.hasPerformanceTracking) {
    redirect("/dashboard?message=plan-no-performance");
  }

  const modalitiesList = await getCachedModalityRefs(supabase);
  const modalityLabels = new Map<string, string>(modalitiesList.map((m) => [m.code, m.name ?? m.code]));

  const allConfigs = await loadAllEvaluationConfigs(supabase);
  const configsForDetail: { modality: string; config: import("@/lib/evaluation-config").ModalityEvaluationConfigPayload }[] = [];
  const configByModality = new Map<string, ModalityConfig>();
  for (const mod of modalitiesList) {
    const config = allConfigs.get(mod.code);
    if (config) {
      configByModality.set(mod.code, {
        criterionToCategory: getCriterionToCategory(config),
        criterionToDimensionCode: getCriterionToDimensionCode(config),
      });
      configsForDetail.push({ modality: mod.code, config });
    }
  }

  let generalPerformanceScores: Record<string, number> | null = null;
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
  let suggestedCourses: { id: string; name: string; category: string; modality: string | null }[] = [];
  let profileAchievements: AchievementWithStatus[] = [];
  let evaluationResultsData: {
    dimensionScores: DimensionScore[];
    criterionScores: CriterionScoreItem[];
    overallScore: number;
    scoresForRadar: Record<string, number>;
  } | null = null;
  let physicalAvatarCarousel: ReturnType<typeof buildPhysicalAvatarCarouselForStudentView> | null = null;
  if (studentId) {
    const [achievementContext, physRes, profileRes] = await Promise.all([
      getAchievementUnlockContext(supabase, studentId),
      supabase
        .from("StudentPhysicalAssessment")
        .select("assessedAt, nextDueAt, formData")
        .eq("studentId", studentId)
        .order("assessedAt", { ascending: false })
        .limit(1),
      supabase.from("StudentProfile").select("heightCm, weightKg").eq("studentId", studentId).maybeSingle(),
    ]);

    profileAchievements = getAchievementsWithStatus(achievementContext);

    const lastPhysRow = physRes.data?.[0] ?? null;
    lastPhysicalAssessment = lastPhysRow
      ? { assessedAt: lastPhysRow.assessedAt, nextDueAt: lastPhysRow.nextDueAt }
      : null;
    const normalizedPhysicalForm = normalizePhysicalFormDataJson(lastPhysRow?.formData ?? null);
    const profileBodyMetrics = {
      heightCm: profileRes.data?.heightCm != null ? Number(profileRes.data.heightCm) : null,
      weightKg: profileRes.data?.weightKg != null ? Number(profileRes.data.weightKg) : null,
    };
    physicalAvatarCarousel = buildPhysicalAvatarCarouselForStudentView(t, lastPhysRow, {
      hasPhysicalAssessmentFromPlatform: achievementContext.hasPhysicalAssessment,
      profileBodyMetrics,
    });
    const today = new Date().toISOString().slice(0, 10);
    physicalAssessmentDue =
      !lastPhysicalAssessment ||
      (lastPhysicalAssessment.nextDueAt != null && lastPhysicalAssessment.nextDueAt <= today);
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
      const { data: student } = await supabase.from("Student").select("primaryModality, planId").eq("id", studentId).single();
      const primaryModality = (student?.primaryModality as string | null) ?? null;
      primaryModalityLabel = primaryModality ? (modalityLabels.get(primaryModality) ?? MODALITY_LABELS[primaryModality] ?? primaryModality) : "Todas as modalidades";
      const athleteXpForMissions = synced?.xp ?? ((athlete.xp as number | null) ?? 0);
      customMissions = (
        await getApplicableMissionTemplates(
          supabase,
          athlete.id,
          athleteXpForMissions,
          primaryModality,
          synced?.displayBeltIndex
        )
      ).map((t) => ({ id: t.id, name: t.name, description: t.description, xpReward: t.xpReward }));
      const { data: latestComment } = await supabase
        .from("Comment")
        .select("content, authorCoachId")
        .eq("targetType", "ATHLETE")
        .eq("targetId", athlete.id)
        .eq("visibility", "SHARED")
        .order("createdAt", { ascending: false })
        .limit(1)
        .maybeSingle();
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
      const { data: evalsRows } = await supabase
        .from("AthleteEvaluation")
        .select("gas, technique, strength, theory, scores, modality, coachId, note, created_at")
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
      }));

      if (evaluations.length > 0) {
        generalPerformanceScores = computeGeneralPerformanceScores(evaluations, configByModality, GENERAL_LAST_N, true);
        if (normalizedPhysicalForm && generalPerformanceScores) {
          generalPerformanceScores = mergePhysicalAssessmentIntoRadar(
            generalPerformanceScores,
            normalizedPhysicalForm
          );
        }
        scoresByModality = computePerformanceScoresByModality(evaluations, configByModality, LAST_N_PER_MODALITY, true);
        const latestEval = evalsRows![0] as { scores?: Record<string, number> | null; coachId?: string; note?: string | null; created_at?: string | null };
        const previousEval = evalsRows!.length > 1 ? (evalsRows![1] as { scores?: Record<string, number> | null }) : null;
        const criterionScoresFromEval = buildCriterionScores(latestEval?.scores ?? null, configsForDetail, previousEval?.scores ?? null);
        if (generalPerformanceScores !== null) {
          const dimensionScores: DimensionScore[] = GENERAL_PERFORMANCE_AXES.map((a) => ({
            id: a.id,
            label: a.label,
            score: generalPerformanceScores![a.id] ?? 0,
            maxScore: 10,
          }));
          const overallScore = dimensionScores.length > 0
            ? dimensionScores.reduce((s, d) => s + d.score, 0) / dimensionScores.length
            : 0;
          const scoresForRadar = { ...generalPerformanceScores };
          const criterionScores =
            criterionScoresFromEval.length > 0
              ? criterionScoresFromEval
              : buildCriterionScoresFromDimensionScores(configsForDetail, generalPerformanceScores);
          evaluationResultsData = {
            dimensionScores,
            criterionScores,
            overallScore,
            scoresForRadar,
          };
        }
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
            note: latestEval.note ?? null,
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

      // Cursos sugeridos para ligar ao feedback (por modalidade principal; aluno vê junto ao feedback do coach)
      const planId = (student?.planId as string | null) ?? null;
      let hasDigitalAccess = false;
      if (planId) {
        const { data: plan } = await supabase.from("Plan").select("includesDigitalAccess").eq("id", planId).eq("isActive", true).single();
        hasDigitalAccess = plan?.includesDigitalAccess === true;
      }
      const [{ data: purchasesData }, { data: coursesData }] = await Promise.all([
        supabase.from("CoursePurchase").select("courseId").eq("studentId", studentId),
        supabase.from("Course").select("id, name, category, modality, included_in_digital_plan").eq("is_active", true).order("sort_order", { ascending: true }).order("name", { ascending: true }),
      ]);
      const purchasedIds = new Set((purchasesData ?? []).map((p: { courseId: string }) => p.courseId));
      const allCourses = coursesData ?? [];
      const accessible = allCourses.filter(
        (c: { id: string; included_in_digital_plan?: boolean }) => (c.included_in_digital_plan && hasDigitalAccess) || purchasedIds.has(c.id)
      );
      suggestedCourses = [...accessible]
        .sort((a, b) => {
          if (!primaryModality) return 0;
          const aMatch = a.modality === primaryModality ? 1 : 0;
          const bMatch = b.modality === primaryModality ? 1 : 0;
          return bMatch - aMatch;
        })
        .slice(0, 3)
        .map((c: { id: string; name: string; category: string; modality: string | null }) => ({ id: c.id, name: c.name, category: c.category, modality: c.modality }));
    }
  }

  // detailSource/detailOrder só são necessários quando não há evaluationResultsData
  // (o AttributeAccordion fica oculto quando o dashboard de resultados está activo)
  let groupedSource: Record<string, import("@/lib/performance-detail-structure").DimensionDetail> = {};
  let groupedOrder: string[] = [];
  if (!evaluationResultsData) {
    const detailByDimension = buildPerformanceDetailFromConfigs(configsForDetail, modalityLabels);
    const useStaticDetail = Object.keys(detailByDimension).length === 0;
    const ds = useStaticDetail ? PERFORMANCE_DETAIL_BY_DIMENSION : detailByDimension;
    const do_ = useStaticDetail ? [...PERFORMANCE_DETAIL_ORDER] : getDetailOrder(detailByDimension);
    let gs = groupDetailByGeneralDimension(ds, do_);
    const fullOrder = [...PERFORMANCE_DETAIL_ORDER];
    for (const dim of fullOrder) {
      if (!gs[dim]?.groups?.length) {
        gs = { ...gs, [dim]: PERFORMANCE_DETAIL_BY_DIMENSION[dim] };
      }
    }
    groupedSource = gs;
    groupedOrder = fullOrder;
  }

  const hasScores = generalPerformanceScores && Object.keys(generalPerformanceScores).length > 0;

  if (!hasScores) {
    return (
      <div className="max-w-[min(720px,100%)] mx-auto space-y-6 pb-8">
        {checkInWellness && (
          <CheckInWellnessSection data={checkInWellness.data} copy={checkInWellness.copy} />
        )}
        <div className="rounded-2xl bg-bg-secondary border border-border p-6 shadow-md">
          <h1 className="text-xl font-bold text-text-primary mb-2">{t("navAthleteProfile")}</h1>
          <p className="text-base text-text-secondary mb-4">{t("evaluationPlaceholder")}</p>
          <Link href="/dashboard" className="btn btn-primary inline-block no-underline">
            {t("perfEmptyBackLink")}
          </Link>
        </div>
      </div>
    );
  }

  const modalityLabelsForDashboard: Record<string, string> = { ...Object.fromEntries(modalityLabels), GENERAL: "Geral" };
  const scoresForDetail = enrichScoresForDetail(generalPerformanceScores!, groupedOrder);

  return (
    <PerformanceFighterDashboard
      backHref="/dashboard"
      backLabel="Voltar ao início"
      scores={scoresForDetail}
      scoresByModality={Object.keys(scoresByModality).length > 0 ? scoresByModality : undefined}
      modalityLabels={modalityLabelsForDashboard}
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
      physicalAssessmentMission={
        physicalAssessmentDue
          ? { id: "physical-assessment", name: lastPhysicalAssessment ? "Renovar avaliação física (obrigatório a cada 6 meses)" : "Realizar avaliação física", description: "Solicita ao teu instrutor a ficha de anamnese e avaliação física.", xpReward: 0 }
          : null
      }
      coachFeedback={coachFeedback ?? undefined}
      coachName={coachName ?? undefined}
      omitLastEvaluationNoteBody={omitLastEvaluationNoteBody}
      lastEvaluation={lastEvaluation ?? undefined}
      evaluationsHistoryHref="/dashboard/performance/historico"
      suggestedCourses={suggestedCourses.length > 0 ? suggestedCourses : undefined}
      profileAchievements={profileAchievements}
      evaluationResultsData={evaluationResultsData}
      checkInWellness={checkInWellness}
      physicalAvatarCarousel={physicalAvatarCarousel}
      physicalFichaReadOnlyLink={{
        href: "/dashboard/ficha-fisica",
        label: t("perfLinkFullPhysicalFicha"),
      }}
      allowLazyHumanoid3d
    />
  );
}
