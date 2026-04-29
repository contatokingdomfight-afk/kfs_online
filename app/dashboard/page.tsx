import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { getThisWeekRangeLisbon } from "@/lib/lesson-utils";
import {
  calendarDateLisbon,
  getLessonCheckInUiState,
  isLessonEligibleForNextCard,
} from "@/lib/lesson-check-in-window";
import { getCachedPlanAccess } from "@/lib/plan-access";
import { getCachedLocations } from "@/lib/cached-reference-data";
import { ChoosePlanCTA } from "@/components/ChoosePlanCTA";
import { LessonPromoBlock } from "./LessonPromoBlock";
import { NextLessonCard } from "./NextLessonCard";
import { OPEN_CLASS_CARD_WIDTH } from "./open-classes-carousel-constants";
import { OpenClassesCarouselShell } from "./OpenClassesCarouselShell";
import { DashboardBelowFold } from "./DashboardBelowFold";
import {
  filterDashboardLessonsByPlanModality,
  isLessonParticipationAllowedByPlan,
} from "@/lib/dashboard-lesson-filter";
import {
  expandLessonsForDateRange,
  fetchLessonCancellations,
  type LessonDefinitionRow,
} from "@/lib/lesson-occurrences";

import { normalizeModalityCode } from "@/lib/modality-normalize";

const MODALITIES_LIST = ["MUAY_THAI", "BOXING", "KICKBOXING", "MMA"] as const;

function BelowFoldSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(20px, 5vw, 24px)" }}>
      <div className="card animate-pulse" style={{ height: 160, padding: "clamp(20px, 5vw, 28px)" }} />
      <div className="card animate-pulse" style={{ height: 120, padding: 0 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "clamp(12px, 3vw, 16px)" }}>
        <div className="card animate-pulse" style={{ height: 100 }} />
        <div className="card animate-pulse" style={{ height: 100 }} />
      </div>
    </div>
  );
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

  const { today, endOfWeek } = getThisWeekRangeLisbon();
  const todayStr = calendarDateLisbon(new Date());

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

  const [lessonsRes, locationsList, schoolsList] = await Promise.all([
    lessonsQuery,
    getCachedLocations(supabase),
    supabase.from("School").select("id, name"),
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
  const lessonsRawExpanded = expanded.map((L) => ({
    ...L,
    date: L.occurrenceDate,
    modality: L.modality ?? "",
    schoolName: L.schoolId ? schoolNameById.get(L.schoolId) ?? null : null,
  }));
  const lessons = filterDashboardLessonsByPlanModality(lessonsRawExpanded, {
    hasPlan,
    allowedModalities,
    studentPrimaryModality,
  });

  const planFilterInput = {
    hasPlan,
    hasCheckIn,
    allowedModalities,
    studentPrimaryModality,
    modalitiesListLength: MODALITIES_LIST.length,
  };
  const locationById = Object.fromEntries(locationsList.map((loc) => [loc.id, loc.name])) as Record<string, string>;
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

  const stripeBanner =
    !hasPlan && stripeQuery === "success"
      ? t("dashboardStripeSuccess")
      : !hasPlan && stripeQuery === "cancel"
        ? t("dashboardStripeCancel")
        : null;

  const openClassesSlotForPlan =
    hasPlan && hasOpenClassesCarousel ? (
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
    ) : null;

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
      {showNextLessonSection && !hasPrimaryNextCarousel && !hasOpenClassesCarousel && !hasPlan && (
        <NextLessonCard isFreeTier={!hasPlan} t={t as (key: string) => string} />
      )}

      {!hasPlan && hasOpenClassesCarousel && (
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

      <Suspense fallback={<BelowFoldSkeleton />}>
        <DashboardBelowFold
          studentId={studentId}
          studentPrimaryModality={studentPrimaryModality}
          hasPlan={hasPlan}
          hasCheckIn={hasCheckIn}
          hasPerformanceTracking={planAccess.hasPerformanceTracking}
          openClassesSlot={openClassesSlotForPlan}
        />
      </Suspense>

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
