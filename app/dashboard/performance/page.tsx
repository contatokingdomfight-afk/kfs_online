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
import { type ModalityConfig, GENERAL_PERFORMANCE_AXES, enrichScoresForDetail, getFisicoScoreFromPhysicalAssessment } from "@/lib/performance-utils";
import { buildEvaluationResultsFromAthleteEvaluations } from "@/lib/build-performance-evaluation-results";
import { getCriterionToCategory, getCriterionToDimensionCode } from "@/lib/evaluation-config";
import { loadAllEvaluationConfigs } from "@/lib/load-evaluation-config";
import { PerformanceFighterDashboard } from "@/components/fighter/PerformanceFighterDashboard";
import {
  PerformanceRadarAvatarCarousel,
  PhysicalAssessmentBodyMapPanel,
} from "@/components/fighter/PerformanceRadarAvatarCarousel";
import { RadarStats } from "@/components/fighter/RadarStatsDynamic";
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
import type { BeltTimeGateInfo } from "@/lib/xp-missions";
import { getRankInfoForStudent } from "@/lib/get-rank-info";
import { getApplicableMissionTemplates } from "@/lib/missions";
import { getCachedModalityRefs } from "@/lib/cached-reference-data";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import { getAchievementUnlockContext, getAchievementsWithStatus } from "@/lib/achievements";
import type { AchievementWithStatus } from "@/lib/achievements";
import type { DimensionScore, CriterionScoreItem } from "@/lib/evaluation-results-data";
import { rankCoursesForImprovement, getImproveSuggestionsForAxes } from "@/lib/library-improve-suggestions";
import { getAccessibleLibraryCoursesForStudent } from "@/lib/accessible-library-courses";
import type { GeneralPerformanceAxisId } from "@/lib/performance-utils";
import { resolveCoachFeedbackForStudentView } from "@/lib/resolve-coach-feedback";

const GENERAL_LAST_N = 10;

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
  let improveSuggestions: Array<{
    axisId: string;
    axisLabel: string;
    course: { id: string; name: string; category: string; modality: string | null };
  }> = [];
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
      locale: locale as "pt" | "en",
      inviteScheduleHref: "/dashboard/ficha-fisica",
    });
    const today = new Date().toISOString().slice(0, 10);
    physicalAssessmentDue =
      !lastPhysicalAssessment ||
      (lastPhysicalAssessment.nextDueAt != null && lastPhysicalAssessment.nextDueAt <= today);
    const athleteState = await getRankInfoForStudent(supabase, studentId);
    if (athleteState) {
      const athleteId = athleteState.athleteId;
      rankInfo = athleteState.rankInfo;
      const { data: student } = await supabase.from("Student").select("primaryModality, planId").eq("id", studentId).single();
      const primaryModality = (student?.primaryModality as string | null) ?? null;
      primaryModalityLabel = primaryModality ? (modalityLabels.get(primaryModality) ?? MODALITY_LABELS[primaryModality] ?? primaryModality) : "Todas as modalidades";
      customMissions = (
        await getApplicableMissionTemplates(
          supabase,
          athleteId,
          athleteState.xp,
          primaryModality,
          athleteState.displayBeltIndex
        )
      ).map((t) => ({ id: t.id, name: t.name, description: t.description, xpReward: t.xpReward }));
      const { data: latestComment } = await supabase
        .from("Comment")
        .select("content, authorCoachId")
        .eq("targetType", "ATHLETE")
        .eq("targetId", athleteId)
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
        .eq("athleteId", athleteId)
        .order("created_at", { ascending: false })
        .limit(GENERAL_LAST_N);
      const aggregateRows = (evalsRows ?? []).map((e) => ({
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
        const latestEval = evalsRows![0] as { scores?: Record<string, number> | null; coachId?: string; note?: string | null; created_at?: string | null };
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

      // «Ver como melhorar» — cursos da biblioteca alinhados aos eixos fracos do radar
      const { courses: accessibleCourses, primaryModality: libPrimaryModality } =
        await getAccessibleLibraryCoursesForStudent(supabase, studentId);
      const weakAxisIds: GeneralPerformanceAxisId[] = generalPerformanceScores
        ? GENERAL_PERFORMANCE_AXES.filter((a) => (generalPerformanceScores![a.id] ?? 0) < 10)
            .sort((a, b) => (generalPerformanceScores![a.id] ?? 0) - (generalPerformanceScores![b.id] ?? 0))
            .slice(0, 3)
            .map((a) => a.id as GeneralPerformanceAxisId)
        : [];
      suggestedCourses = rankCoursesForImprovement(
        accessibleCourses,
        weakAxisIds,
        primaryModality ?? libPrimaryModality,
        3
      );
      if (weakAxisIds.length > 0) {
        improveSuggestions = getImproveSuggestionsForAxes(
          accessibleCourses,
          weakAxisIds.map((id) => {
            const axis = GENERAL_PERFORMANCE_AXES.find((a) => a.id === id);
            return { id, label: axis?.label ?? id };
          }),
          primaryModality ?? libPrimaryModality
        );
      }
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
    const radarScoresPlaceholder = Object.fromEntries(
      GENERAL_PERFORMANCE_AXES.map((a) => [a.id, 0])
    ) as Record<string, number>;
    const wellnessCopyEmptyScores =
      checkInWellness &&
      ({
        ...checkInWellness.copy,
        bodyMapSectionTitle: t("perfWellnessBodyMapSectionTitle"),
        bodyMapEvalHint: evaluationResultsData ? undefined : t("perfWellnessBodyMapEmptyScoresHint"),
      } satisfies CheckInWellnessCopy);

    return (
      <div className="max-w-[min(720px,100%)] mx-auto space-y-6 pb-8">
        {checkInWellness && wellnessCopyEmptyScores ? (
          <>
            <div className="space-y-2">
              <PerformanceRadarAvatarCarousel
                radar={
                  <RadarStats
                    scores={radarScoresPlaceholder}
                    axes={[...GENERAL_PERFORMANCE_AXES]}
                    maxScore={10}
                  />
                }
                payload={physicalAvatarCarousel}
                radarOnly
                radarOnlyHint={t("perfCarouselRadarOnlyHint")}
              />
            </div>
            <CheckInWellnessSection
              data={checkInWellness.data}
              copy={wellnessCopyEmptyScores}
              bodyMappingSlot={
                <>
                  {physicalAvatarCarousel ? (
                    <PhysicalAssessmentBodyMapPanel payload={physicalAvatarCarousel} />
                  ) : null}
                  <p className="m-0 text-center text-xs sm:text-left">
                    <Link
                      href="/dashboard/ficha-fisica"
                      className="font-medium text-[var(--primary)] no-underline hover:underline"
                    >
                      {t("perfLinkFullPhysicalFicha")}
                    </Link>
                  </p>
                </>
              }
            />
          </>
        ) : null}
        <div className="rounded-2xl bg-bg-secondary border border-border p-6 shadow-md">
          <h1 className="text-xl font-bold text-text-primary mb-2">{t("navAthleteProfile")}</h1>
          <p className="text-base text-text-secondary mb-3 leading-relaxed">{t("perfEmptyWhy")}</p>
          <p className="text-base text-text-secondary mb-3 leading-relaxed">{t("perfEmptyWhatNext")}</p>
          <p className="text-sm text-text-secondary mb-5 leading-relaxed">{t("perfEmptyHintAttendance")}</p>
          <div className="flex flex-wrap gap-3 items-center">
            <Link href="/como-sou-avaliado" className="btn btn-primary inline-block no-underline">
              {t("perfEmptyCtaHowEvaluated")}
            </Link>
            {planAccess.hasCheckIn ? (
              <Link
                href="/dashboard/historico"
                className="btn btn-secondary inline-block no-underline"
              >
                {t("perfEmptyCtaAttendance")}
              </Link>
            ) : null}
          </div>
          <p className="mt-4 mb-0 text-sm">
            <Link href="/dashboard" className="text-[var(--text-secondary)] no-underline hover:underline">
              {t("perfEmptyBackLink")}
            </Link>
          </p>
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
      improveSuggestions={improveSuggestions.length > 0 ? improveSuggestions : undefined}
      profileAchievements={profileAchievements}
      evaluationResultsData={evaluationResultsData}
      checkInWellness={
        checkInWellness
          ? {
              ...checkInWellness,
              copy: {
                ...checkInWellness.copy,
                bodyMapSectionTitle: t("perfWellnessBodyMapSectionTitle"),
              },
            }
          : undefined
      }
      physicalAvatarCarousel={physicalAvatarCarousel}
      physicalFichaReadOnlyLink={{
        href: "/dashboard/ficha-fisica",
        label: t("perfLinkFullPhysicalFicha"),
      }}
      physicalRadarOnlyHint={checkInWellness ? t("perfCarouselRadarOnlyHint") : undefined}
      locale={locale as "pt" | "en"}
    />
  );
}
