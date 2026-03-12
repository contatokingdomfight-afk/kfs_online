import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { getThisWeekRange, MODALITY_LABELS, getWeekStartMonday } from "@/lib/lesson-utils";
import { getCachedLocations } from "@/lib/cached-reference-data";
import { getPlanAccess } from "@/lib/plan-access";
import { getApplicableMissionTemplates } from "@/lib/missions";
import { NextLessonCard } from "./NextLessonCard";
import { WarriorPanel } from "./WarriorPanel";
import { WhatIsNew } from "./WhatIsNew";
import { ExploreSection } from "./ExploreSection";

const MODALITIES_LIST = ["MUAY_THAI", "BOXING", "KICKBOXING"] as const;

export default async function DashboardPage() {
  const supabase = await createClient();
  const [locale, dbUser] = await Promise.all([getLocaleFromCookies(), getCurrentDbUser()]);
  const t = getTranslations(locale as "pt" | "en");
  const STATUS_LABEL: Record<string, string> = {
    PENDING: t("statusPending"),
    CONFIRMED: t("statusConfirmed"),
    ABSENT: t("statusAbsent"),
  };

  if (!dbUser) return null;

  const studentId = await getCurrentStudentId();
  const planAccess = await getPlanAccess(supabase, studentId);
  const { hasCheckIn, allowedModalities } = planAccess;

  const { today, endOfWeek } = getThisWeekRange();
  const weekStart = getWeekStartMonday();
  const todayStr = new Date().toISOString().slice(0, 10);
  const monthStart = new Date().toISOString().slice(0, 7) + "-01";
  const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10);

  let studentSchoolId: string | null = null;
  let studentPrimaryModality: string | null = null;
  if (studentId) {
    const { data: student } = await supabase.from("Student").select("schoolId, primaryModality").eq("id", studentId).single();
    studentSchoolId = student?.schoolId ?? null;
    studentPrimaryModality = (student as { primaryModality?: string } | null)?.primaryModality ?? null;
  }

  let lessonsQuery = supabase
    .from("Lesson")
    .select("id, modality, date, startTime, endTime, locationId")
    .gte("date", today)
    .lte("date", endOfWeek);
  if (studentSchoolId) lessonsQuery = lessonsQuery.eq("schoolId", studentSchoolId);

  const [lessonsRes, locationsList, weekThemesRes, goalRes, athleteRes, confirmedAttRes] = await Promise.all([
    lessonsQuery.order("date", { ascending: true }).order("startTime", { ascending: true }),
    getCachedLocations(supabase),
    supabase.from("WeekTheme").select("modality, title, course_id, video_url").eq("week_start", weekStart).order("modality", { ascending: true }),
    supabase.from("AttendanceGoal").select("target_value").eq("is_global", true).limit(1).single(),
    studentId ? supabase.from("Athlete").select("id, currentBelt, currentXP").eq("studentId", studentId).single() : Promise.resolve({ data: null }),
    studentId ? supabase.from("Attendance").select("lessonId").eq("studentId", studentId).eq("status", "CONFIRMED") : Promise.resolve({ data: [] }),
  ]);

  const lessonsData = lessonsRes.data ?? [];
  const locationById = new Map(locationsList.map((loc) => [loc.id, loc.name]));
  const temaSemanaList = weekThemesRes.data ?? [];

  const allLessons = lessonsData;
  const lessons =
    allowedModalities.length === 0 ? [] : allowedModalities.length < MODALITIES_LIST.length ? allLessons.filter((l) => allowedModalities.includes(l.modality)) : allLessons;
  const nextLesson = lessons[0] ?? null;

  const lessonIds = lessons.map((l) => l.id);
  const attendanceByLesson: Record<string, { status: string; checkedInAt: string | null }> = {};
  if (studentId && lessonIds.length > 0) {
    const { data: attendances } = await supabase
      .from("Attendance")
      .select("lessonId, status, checkedInAt")
      .eq("studentId", studentId)
      .in("lessonId", lessonIds);
    (attendances ?? []).forEach((a) => {
      attendanceByLesson[a.lessonId] = {
        status: a.status,
        checkedInAt: (a as { checkedInAt?: string | null }).checkedInAt ?? null,
      };
    });
  }

  let attendanceGoal = 10;
  if (goalRes.data) attendanceGoal = goalRes.data.target_value ?? 10;

  const confirmedAtt = confirmedAttRes.data ?? [];
  const allLessonIds = [...new Set(confirmedAtt.map((a) => a.lessonId))];
  let currentMonthCount = 0;
  let totalPresences = 0;
  let athleteStats: { currentBelt: string | null; currentXP: number; nextLevelXP: number } | null = null;
  let weekThemeForPrimary: { modality: string; title: string; course_id: string | null; video_url: string | null } | null = null;
  let nextMission: { id: string; name: string; description: string | null; xpReward: number } | null = null;
  let coachFeedback: { content: string; coachName: string; date: string } | null = null;

  if (allLessonIds.length > 0) {
    const { data: confirmedLessons } = await supabase.from("Lesson").select("id, date").in("id", allLessonIds);
    const lessonsList = confirmedLessons ?? [];
    currentMonthCount = lessonsList.filter((l) => l.date >= monthStart && l.date <= monthEnd).length;
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
    const { count } = await supabase.from("Attendance").select("*", { count: "exact", head: true }).eq("studentId", studentId).eq("status", "CONFIRMED");
    totalPresences = count ?? 0;

    if (studentPrimaryModality) {
      const theme = temaSemanaList.find((t) => t.modality === studentPrimaryModality);
      if (theme) weekThemeForPrimary = { modality: theme.modality, title: theme.title, course_id: theme.course_id, video_url: (theme as { video_url?: string | null }).video_url ?? null };
    } else if (temaSemanaList.length > 0) {
      const theme = temaSemanaList[0];
      weekThemeForPrimary = { modality: theme.modality, title: theme.title, course_id: theme.course_id, video_url: (theme as { video_url?: string | null }).video_url ?? null };
    }

    const missions = await getApplicableMissionTemplates(supabase, athlete.id, athlete.currentXP || 0, studentPrimaryModality);
    if (missions.length > 0) {
      const m = missions[0];
      nextMission = { id: m.id, name: m.name, description: m.description, xpReward: m.xpReward };
    }

    const { data: latestComment } = await supabase
      .from("Comment")
      .select("content, authorCoachId, createdAt")
      .eq("targetType", "ATHLETE")
      .eq("targetId", athlete.id)
      .eq("visibility", "SHARED")
      .order("createdAt", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestComment?.content) {
      let coachName = "Treinador";
      if (latestComment.authorCoachId) {
        const { data: coach } = await supabase.from("Coach").select("userId").eq("id", latestComment.authorCoachId).single();
        if (coach) {
          const { data: user } = await supabase.from("User").select("name").eq("id", coach.userId).single();
          coachName = user?.name ?? "Treinador";
        }
      }
      coachFeedback = {
        content: latestComment.content,
        coachName,
        date: latestComment.createdAt,
      };
    }
  }

  const beltLabel = athleteStats?.currentBelt ? t(("belt_" + athleteStats.currentBelt) as "belt_WHITE") : "—";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(20px, 5vw, 24px)" }}>
      <NextLessonCard
        lesson={nextLesson}
        locationById={locationById}
        attendanceByLesson={attendanceByLesson}
        locale={locale as "pt" | "en"}
        todayStr={todayStr}
        hasCheckIn={hasCheckIn}
        t={t as (key: string) => string}
        statusLabels={STATUS_LABEL}
      />

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

      <ExploreSection hasPerformanceTracking={planAccess.hasPerformanceTracking} t={t as (key: string) => string} />

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
