import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { getThisWeekRange, MODALITY_LABELS, getWeekStartMonday } from "@/lib/lesson-utils";
import { getLessonCheckInUiState, isLessonEligibleForNextCard } from "@/lib/lesson-check-in-window";
import { getCachedLocations } from "@/lib/cached-reference-data";
import { getCachedPlanAccess } from "@/lib/plan-access";
import { getApplicableMissionTemplates } from "@/lib/missions";
import { ChoosePlanCTA } from "@/components/ChoosePlanCTA";
import { LessonPromoBlock } from "./LessonPromoBlock";
import { NextLessonCard } from "./NextLessonCard";
import { OPEN_CLASS_CARD_WIDTH } from "./open-classes-carousel-constants";
import { OpenClassesCarouselShell } from "./OpenClassesCarouselShell";
import { WarriorPanel } from "./WarriorPanel";
import { WhatIsNew } from "./WhatIsNew";
import { ExploreSection } from "./ExploreSection";
import { resolveCoachFeedbackForStudentView } from "@/lib/resolve-coach-feedback";
import { isLessonParticipationAllowedByPlan } from "@/lib/dashboard-lesson-filter";
import {
  expandLessonsForDateRange,
  fetchLessonCancellations,
  type LessonDefinitionRow,
} from "@/lib/lesson-occurrences";

const MODALITIES_LIST = ["MUAY_THAI", "BOXING", "KICKBOXING"] as const;
const MODALITY_ALIASES: Record<string, string> = {
  MUAY_THAI: "MUAY_THAI",
  "MUAY THAI": "MUAY_THAI",
  MUAYTHAI: "MUAY_THAI",
  BOXING: "BOXING",
  KICKBOXING: "KICKBOXING",
  "KICK BOXING": "KICKBOXING",
};

function normalizeModalityCode(value: string | null | undefined): string | null {
  if (!value) return null;
  const key = value.trim().toUpperCase();
  return MODALITY_ALIASES[key] ?? null;
}

type PageProps = { searchParams: Promise<{ stripe?: string }> };

export default async function DashboardPage({ searchParams }: PageProps) {
  const { stripe: stripeQuery } = await searchParams;
  const [locale, dbUser, supabase] = await Promise.all([
    getLocaleFromCookies(),
    getCurrentDbUser(),
    createClient(),
  ]);
  const t = getTranslations(locale as "pt" | "en");
  const STATUS_LABEL: Record<string, string> = {
    PENDING: t("statusPending"),
    CONFIRMED: t("statusConfirmed"),
    ABSENT: t("statusAbsent"),
  };

  if (!dbUser) return null;

  const studentId = await getCurrentStudentId();
  const planAccess = await getCachedPlanAccess(studentId);
  const { hasCheckIn, allowedModalities } = planAccess;

  const { today, endOfWeek } = getThisWeekRange();
  const weekStart = getWeekStartMonday();
  const todayStr = new Date().toISOString().slice(0, 10);
  const monthStart = new Date().toISOString().slice(0, 7) + "-01";
  const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10);

  let studentSchoolId: string | null = null;
  let studentPrimaryModality: string | null = null;
  let hasPlan = false;
  if (studentId) {
    const { data: student } = await supabase.from("Student").select("schoolId, primaryModality, planId").eq("id", studentId).single();
    studentSchoolId = student?.schoolId ?? null;
    studentPrimaryModality = normalizeModalityCode((student as { primaryModality?: string } | null)?.primaryModality ?? null);
    hasPlan = !!student?.planId;
  }

  let lessonsQuery = supabase
    .from("Lesson")
    .select("id, modality, date, weekday, startTime, endTime, locationId, isOpenClass, schoolId, isOneOff, coachId")
    .order("startTime", { ascending: true });
  if (studentSchoolId) {
    lessonsQuery = lessonsQuery.or(`schoolId.eq.${studentSchoolId},isOpenClass.eq.true`);
  } else {
    lessonsQuery = lessonsQuery.eq("isOpenClass", true);
  }

  const [lessonsRes, locationsList, schoolsList, weekThemesRes, goalRes, athleteRes] = await Promise.all([
    lessonsQuery,
    getCachedLocations(supabase),
    supabase.from("School").select("id, name"),
    supabase.from("WeekTheme").select("modality, title, course_id, video_url").eq("week_start", weekStart).order("modality", { ascending: true }),
    supabase.from("AttendanceGoal").select("target_value").eq("is_global", true).limit(1).single(),
    studentId ? supabase.from("Athlete").select("id, currentBelt, currentXP").eq("studentId", studentId).single() : Promise.resolve({ data: null }),
  ]);

  const lessonsRaw = lessonsRes.data ?? [];
  const schoolNameById = new Map((schoolsList.data ?? []).map((s) => [s.id, s.name]));
  const lessonIds = lessonsRaw.map((l) => (l as { id: string }).id);
  const cancellations = await fetchLessonCancellations(supabase, lessonIds);

  const lessonsAsDefs: LessonDefinitionRow[] = (lessonsRaw ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const id = String(r.id);
    return {
      id,
      modality: (r.modality as string | null) ?? null,
      date: typeof r.date === "string" ? r.date.slice(0, 10) : (r.date as string | null),
      weekday:
        typeof r.weekday === "number" ? r.weekday : r.weekday != null ? Number(r.weekday) : null,
      startTime: String(r.startTime ?? ""),
      endTime: String(r.endTime ?? ""),
      coachId: String(r.coachId ?? ""),
      schoolId: String(r.schoolId ?? ""),
      locationId: (r.locationId as string | null) ?? null,
      capacity: (r.capacity as number | null) ?? null,
      planningNotes: (r.planningNotes as string | null) ?? null,
      isOneOff: Boolean(r.isOneOff),
      isOpenClass: Boolean(r.isOpenClass),
    };
  });

  const expanded = expandLessonsForDateRange(lessonsAsDefs, cancellations, today, endOfWeek);
  const lessons = expanded.map((L) => ({
    ...L,
    date: L.occurrenceDate,
    modality: L.modality ?? "",
    schoolName: L.schoolId ? schoolNameById.get(L.schoolId) ?? null : null,
  }));

  const planFilterInput = {
    hasPlan,
    hasCheckIn,
    allowedModalities,
    studentPrimaryModality,
    modalitiesListLength: MODALITIES_LIST.length,
  };
  const locationById = Object.fromEntries(locationsList.map((loc) => [loc.id, loc.name])) as Record<string, string>;
  const temaSemanaList = weekThemesRes.data ?? [];
  const nowForCard = new Date();
  const eligibleLessons = lessons.filter((l) => isLessonEligibleForNextCard(l, nowForCard));
  const nonOpenUpcoming = eligibleLessons.filter((l) => !Boolean((l as { isOpenClass?: boolean }).isOpenClass));
  const openUpcoming = eligibleLessons.filter((l) => Boolean((l as { isOpenClass?: boolean }).isOpenClass));

  /** Com plano: aulas normais (não «livres»). Sem plano: todas as aulas livres elegíveis ficam aqui (evita duplicar a secção de baixo). */
  const primaryNextRows =
    nonOpenUpcoming.length > 0
      ? nonOpenUpcoming.map((lesson) => ({ lesson, ...getLessonCheckInUiState(lesson, nowForCard) }))
      : openUpcoming.map((lesson) => ({ lesson, ...getLessonCheckInUiState(lesson, nowForCard) }));

  const additionalOpenLessons =
    nonOpenUpcoming.length > 0
      ? openUpcoming.map((lesson) => ({ lesson, ...getLessonCheckInUiState(lesson, nowForCard) }))
      : [];

  const showNextLessonSection = lessons.length > 0;

  const hasOpenClassesCarousel = additionalOpenLessons.length > 0;
  const hasPrimaryNextCarousel = primaryNextRows.length > 0;

  const uniqueLessonIdsForAttendance = [...new Set(lessons.map((l) => l.id))];
  const attendanceByLesson: Record<string, { status: string; checkedInAt: string | null }> = {};
  if (studentId && uniqueLessonIdsForAttendance.length > 0) {
    const { data: attendances } = await supabase
      .from("Attendance")
      .select("lessonId, status, checkedInAt, occurrenceDate")
      .eq("studentId", studentId)
      .in("lessonId", uniqueLessonIdsForAttendance);
    (attendances ?? []).forEach((a) => {
      const occ = (a as { occurrenceDate?: string | null }).occurrenceDate?.slice(0, 10) ?? "";
      const key = occ ? `${a.lessonId}_${occ}` : a.lessonId;
      attendanceByLesson[key] = {
        status: a.status,
        checkedInAt: (a as { checkedInAt?: string | null }).checkedInAt ?? null,
      };
    });
  }

  let attendanceGoal = 10;
  if (goalRes.data) attendanceGoal = goalRes.data.target_value ?? 10;

  let currentMonthCount = 0;
  let totalPresences = 0;
  let athleteStats: { currentBelt: string | null; currentXP: number; nextLevelXP: number } | null = null;
  let weekThemeForPrimary: { modality: string; title: string; course_id: string | null; video_url: string | null } | null = null;
  let nextMission: { id: string; name: string; description: string | null; xpReward: number } | null = null;
  let coachFeedback: { content: string; coachName: string; date: string } | null = null;

  if (studentId) {
    const { count: monthAttCount } = await supabase
      .from("Attendance")
      .select("id", { count: "exact", head: true })
      .eq("studentId", studentId)
      .eq("status", "CONFIRMED")
      .gte("occurrenceDate", monthStart)
      .lte("occurrenceDate", monthEnd);
    currentMonthCount = monthAttCount ?? 0;
  }

  const athlete = athleteRes.data;
  if (athlete) {
    const beltLevels = ["WHITE", "YELLOW", "ORANGE", "GREEN", "BLUE", "PURPLE", "BROWN", "BLACK", "BLACK_1", "BLACK_2", "BLACK_3", "GOLDEN"];
    const currentIndex = beltLevels.indexOf(athlete.currentBelt || "WHITE");
    const baseXP = 1000;
    const nextLevelXP = currentIndex >= 0 ? baseXP * Math.pow(2, currentIndex) : baseXP;
    athleteStats = {
      currentBelt: athlete.currentBelt,
      currentXP: athlete.currentXP || 0,
      nextLevelXP,
    };

    const [countRes, missions, latestCommentRes, latestEvalRes] = await Promise.all([
      supabase.from("Attendance").select("*", { count: "exact", head: true }).eq("studentId", studentId).eq("status", "CONFIRMED"),
      getApplicableMissionTemplates(supabase, athlete.id, athlete.currentXP || 0, studentPrimaryModality),
      supabase
        .from("Comment")
        .select("content, authorCoachId, createdAt")
        .eq("targetType", "ATHLETE")
        .eq("targetId", athlete.id)
        .eq("visibility", "SHARED")
        .order("createdAt", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("AthleteEvaluation")
        .select("note, coachId, created_at")
        .eq("athleteId", athlete.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    totalPresences = countRes.count ?? 0;

    if (studentPrimaryModality) {
      const theme = temaSemanaList.find((t) => t.modality === studentPrimaryModality);
      if (theme) weekThemeForPrimary = { modality: theme.modality, title: theme.title, course_id: theme.course_id, video_url: (theme as { video_url?: string | null }).video_url ?? null };
    } else if (temaSemanaList.length > 0) {
      const theme = temaSemanaList[0];
      weekThemeForPrimary = { modality: theme.modality, title: theme.title, course_id: theme.course_id, video_url: (theme as { video_url?: string | null }).video_url ?? null };
    }

    if (missions.length > 0) {
      const m = missions[0];
      nextMission = { id: m.id, name: m.name, description: m.description, xpReward: m.xpReward };
    }

    const latestComment = latestCommentRes.data;
    const latestEval = latestEvalRes.data as { note?: string | null; coachId?: string | null; created_at?: string | null } | null;

    let sharedCommentContent: string | null = null;
    let sharedCommentCoachName: string | null = null;
    let sharedCommentDate: string | null = null;
    if (latestComment?.content) {
      sharedCommentContent = latestComment.content;
      sharedCommentDate = latestComment.createdAt;
      if (latestComment.authorCoachId) {
        const { data: coach } = await supabase.from("Coach").select("userId").eq("id", latestComment.authorCoachId).single();
        if (coach) {
          const { data: user } = await supabase.from("User").select("name").eq("id", coach.userId).single();
          sharedCommentCoachName = user?.name ?? "Treinador";
        } else {
          sharedCommentCoachName = "Treinador";
        }
      } else {
        sharedCommentCoachName = "Treinador";
      }
    }

    let lastEvalCoachName: string | null = null;
    let lastEvalNote: string | null = null;
    let lastEvalDate: string | null = null;
    if (latestEval?.coachId && latestEval.note?.trim()) {
      lastEvalNote = latestEval.note ?? null;
      lastEvalDate = latestEval.created_at ?? null;
      const { data: coachRow } = await supabase.from("Coach").select("userId").eq("id", latestEval.coachId).single();
      if (coachRow) {
        const { data: userRow } = await supabase.from("User").select("name").eq("id", coachRow.userId).single();
        lastEvalCoachName = userRow?.name ?? "Treinador";
      } else {
        lastEvalCoachName = "Treinador";
      }
    }

    const homeFeedbackResolved = resolveCoachFeedbackForStudentView({
      sharedCommentContent,
      sharedCommentCoachName,
      lastEvaluationCoachName: lastEvalCoachName,
      lastEvaluationNote: lastEvalNote,
    });
    if (homeFeedbackResolved.quote) {
      const dateStr =
        homeFeedbackResolved.source === "comment"
          ? sharedCommentDate
          : lastEvalDate;
      coachFeedback = {
        content: homeFeedbackResolved.quote,
        coachName: homeFeedbackResolved.coachName ?? "Treinador",
        date: dateStr ?? new Date().toISOString(),
      };
    }
  }

  const beltLabel = athleteStats?.currentBelt ? t(("belt_" + athleteStats.currentBelt) as "belt_WHITE") : "—";

  const stripeBanner =
    !hasPlan && stripeQuery === "success"
      ? t("dashboardStripeSuccess")
      : !hasPlan && stripeQuery === "cancel"
        ? t("dashboardStripeCancel")
        : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(20px, 5vw, 24px)" }}>
      {!hasPlan && stripeBanner && (
        <div
          role="status"
          className="card"
          style={{
            padding: "clamp(14px, 3.5vw, 18px)",
            borderLeft: "4px solid var(--primary)",
            fontSize: "clamp(14px, 3.5vw, 16px)",
            color: "var(--text-primary)",
          }}
        >
          {stripeBanner}
        </div>
      )}
      {!hasPlan && (
        <ChoosePlanCTA message={t("freeTierCtaMessage")} ctaLabel={t("freeTierCtaButton")} />
      )}
      {showNextLessonSection && hasPrimaryNextCarousel && (
        <OpenClassesCarouselShell
          itemCount={primaryNextRows.length}
          sectionTitle={t("dashboardNextLessonTitle")}
          swipeHint={t("dashboardNextLessonCarouselHint")}
          ariaLabelPrev={t("dashboardCarouselPrev")}
          ariaLabelNext={t("dashboardCarouselNext")}
        >
          {primaryNextRows.map((row) => (
            <div
              key={(row.lesson as { occurrenceKey?: string }).occurrenceKey ?? `${row.lesson.id}-${row.lesson.date}`}
              style={{
                flex: `0 0 ${OPEN_CLASS_CARD_WIDTH}`,
                maxWidth: OPEN_CLASS_CARD_WIDTH,
                scrollSnapAlign: "start",
                minHeight: 1,
              }}
            >
              <LessonPromoBlock
                lesson={row.lesson}
                studentSchoolId={studentSchoolId}
                checkInWindowOpen={row.checkInWindowOpen}
                checkInStartTimeLabel={row.checkInStartTimeLabel}
                locationById={locationById}
                attendanceByLesson={attendanceByLesson}
                attendanceLookupKey={`${row.lesson.id}_${row.lesson.date}`}
                participationAllowedByPlan={isLessonParticipationAllowedByPlan(row.lesson, planFilterInput)}
                hasPlan={hasPlan}
                hasCheckIn={hasCheckIn}
                locale={locale as "pt" | "en"}
                todayStr={todayStr}
                isFreeTier={!hasPlan}
                t={t as (key: string) => string}
                statusLabels={STATUS_LABEL}
              />
            </div>
          ))}
        </OpenClassesCarouselShell>
      )}
      {showNextLessonSection && !hasPrimaryNextCarousel && !hasOpenClassesCarousel && (
        <NextLessonCard isFreeTier={!hasPlan} t={t as (key: string) => string} />
      )}

      {hasPlan && (
        <WarriorPanel
          studentName={dbUser?.name ?? null}
          currentBelt={athleteStats?.currentBelt ?? null}
          currentXP={athleteStats?.currentXP ?? 0}
          nextLevelXP={athleteStats?.nextLevelXP ?? 1000}
          totalPresences={totalPresences}
          currentMonthCount={currentMonthCount}
          attendanceGoal={attendanceGoal}
          hasCheckIn={hasCheckIn}
          hasPerformanceTracking={planAccess.hasPerformanceTracking}
          t={t as (key: string) => string}
          beltLabel={beltLabel}
        />
      )}

      {hasOpenClassesCarousel && (
        <OpenClassesCarouselShell
          itemCount={additionalOpenLessons.length}
          sectionTitle={t("dashboardOpenClassesThisWeekTitle")}
          swipeHint={t("dashboardOpenClassesCarouselHint")}
          ariaLabelPrev={t("dashboardCarouselPrev")}
          ariaLabelNext={t("dashboardCarouselNext")}
        >
          {additionalOpenLessons.map((row) => (
            <div
              key={(row.lesson as { occurrenceKey?: string }).occurrenceKey ?? `${row.lesson.id}-${row.lesson.date}`}
              style={{
                flex: `0 0 ${OPEN_CLASS_CARD_WIDTH}`,
                maxWidth: OPEN_CLASS_CARD_WIDTH,
                scrollSnapAlign: "start",
                minHeight: 1,
              }}
            >
              <LessonPromoBlock
                lesson={row.lesson}
                studentSchoolId={studentSchoolId}
                checkInWindowOpen={row.checkInWindowOpen}
                checkInStartTimeLabel={row.checkInStartTimeLabel}
                locationById={locationById}
                attendanceByLesson={attendanceByLesson}
                attendanceLookupKey={`${row.lesson.id}_${row.lesson.date}`}
                participationAllowedByPlan={isLessonParticipationAllowedByPlan(row.lesson, planFilterInput)}
                hasPlan={hasPlan}
                hasCheckIn={hasCheckIn}
                locale={locale as "pt" | "en"}
                todayStr={todayStr}
                isFreeTier={!hasPlan}
                t={t as (key: string) => string}
                statusLabels={STATUS_LABEL}
              />
            </div>
          ))}
        </OpenClassesCarouselShell>
      )}

      {hasPlan && (
        <WhatIsNew
          weekTheme={weekThemeForPrimary}
          nextMission={nextMission}
          coachFeedback={coachFeedback}
          locale={locale as "pt" | "en"}
          labels={{
            title: t("dashboardWhatIsNewTitle"),
            tabTheme: t("dashboardTabWeekTheme"),
            tabMission: t("dashboardTabNextMission"),
            tabFeedback: t("dashboardTabLastFeedback"),
            viewTheory: t("dashboardViewTheory"),
            viewVideo: t("dashboardViewVideo"),
            noWeekTheme: t("dashboardNoWeekTheme"),
            viewAllMissions: t("dashboardViewAllMissions"),
            noMissions: t("dashboardNoMissions"),
            noCoachFeedback: t("dashboardNoCoachFeedback"),
          }}
        />
      )}

      {hasPlan && <ExploreSection hasPerformanceTracking={planAccess.hasPerformanceTracking} t={t as (key: string) => string} />}

      <div className="card">
        <p style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)", marginBottom: 12 }}>
          {t("restrictedArea")} Email: {dbUser?.email}
          {dbUser?.name && ` · ${dbUser.name}`}
        </p>
        <p style={{ fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
          {t("profile")} {dbUser?.role ?? "—"}
        </p>
      </div>
    </div>
  );
}
