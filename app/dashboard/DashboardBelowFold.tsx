import { createClient } from "@/lib/supabase/server";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getTranslations } from "@/lib/i18n";
import { getWeekStartMonday, MODALITY_LABELS } from "@/lib/lesson-utils";
import { getApplicableMissionTemplates } from "@/lib/missions";
import { syncAthleteDisplayBelt } from "@/lib/sync-athlete-display-belt";
import { resolveCoachFeedbackForStudentView } from "@/lib/resolve-coach-feedback";
import { WarriorPanel } from "./WarriorPanel";
import { WhatIsNew } from "./WhatIsNew";
import { ExploreSection } from "./ExploreSection";

const BELT_LEVELS = [
  "WHITE", "YELLOW", "ORANGE", "GREEN", "BLUE", "PURPLE",
  "BROWN", "BLACK", "BLACK_1", "BLACK_2", "BLACK_3", "GOLDEN",
];

type Props = {
  studentId: string | null;
  studentPrimaryModality: string | null;
  hasPlan: boolean;
  hasCheckIn: boolean;
  hasPerformanceTracking: boolean;
};

export async function DashboardBelowFold({
  studentId,
  studentPrimaryModality,
  hasPlan,
  hasCheckIn,
  hasPerformanceTracking,
}: Props) {
  if (!hasPlan) return null;

  const [locale, supabase, dbUser] = await Promise.all([
    getLocaleFromCookies(),
    createClient(),
    getCurrentDbUser(),
  ]);
  const t = getTranslations(locale as "pt" | "en");
  const weekStart = getWeekStartMonday();
  const monthStart = new Date().toISOString().slice(0, 7) + "-01";
  const monthEnd = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    0,
  ).toISOString().slice(0, 10);

  let athleteStats: { currentBelt: string | null; currentXP: number; nextLevelXP: number } | null = null;
  let weekThemeForPrimary: { modality: string; title: string; course_id: string | null; video_url: string | null } | null = null;
  let nextMission: { id: string; name: string; description: string | null; xpReward: number } | null = null;
  let coachFeedback: { content: string; coachName: string; date: string } | null = null;
  let totalPresences = 0;
  let currentMonthCount = 0;
  let attendanceGoal = 10;

  const [goalRes, athleteRes, weekThemesRes] = await Promise.all([
    supabase.from("AttendanceGoal").select("target_value").eq("is_global", true).limit(1).single(),
    studentId
      ? supabase
          .from("Athlete")
          .select("id, currentBelt, currentXP, xp, displayBeltIndex, lastBeltPromotionAt, createdAt")
          .eq("studentId", studentId)
          .single()
      : Promise.resolve({ data: null }),
    supabase
      .from("WeekTheme")
      .select("modality, title, course_id, video_url")
      .eq("week_start", weekStart)
      .order("modality", { ascending: true }),
  ]);

  if (goalRes.data) attendanceGoal = goalRes.data.target_value ?? 10;

  const temaSemanaList = weekThemesRes.data ?? [];
  const athlete = athleteRes.data;

  if (studentId) {
    const { count: monthAttCount } = await supabase
      .from("Attendance")
      .select("id", { count: "exact", head: true })
      .eq("studentId", studentId)
      .eq("status", "CONFIRMED")
      .eq("countsForGamification", true)
      .gte("occurrenceDate", monthStart)
      .lte("occurrenceDate", monthEnd);
    currentMonthCount = monthAttCount ?? 0;
  }

  if (athlete) {
    const currentIndex = BELT_LEVELS.indexOf(athlete.currentBelt || "WHITE");
    const baseXP = 1000;
    const nextLevelXP = currentIndex >= 0 ? baseXP * Math.pow(2, currentIndex) : baseXP;
    athleteStats = {
      currentBelt: athlete.currentBelt,
      currentXP: athlete.currentXP || 0,
      nextLevelXP,
    };

    const synced = await syncAthleteDisplayBelt(supabase, athlete.id);
    const xpForMissions =
      synced?.xp ??
      ((athlete as { xp?: number; currentXP?: number }).xp ?? (athlete as { currentXP?: number }).currentXP ?? 0);

    const [countRes, missions, latestCommentRes, latestEvalRes] = await Promise.all([
      supabase
        .from("Attendance")
        .select("*", { count: "exact", head: true })
        .eq("studentId", studentId)
        .eq("status", "CONFIRMED")
        .eq("countsForGamification", true),
      getApplicableMissionTemplates(
        supabase,
        athlete.id,
        xpForMissions,
        studentPrimaryModality,
        synced?.displayBeltIndex,
      ),
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
      const theme = temaSemanaList.find((th) => th.modality === studentPrimaryModality);
      if (theme)
        weekThemeForPrimary = {
          modality: theme.modality,
          title: theme.title,
          course_id: theme.course_id,
          video_url: (theme as { video_url?: string | null }).video_url ?? null,
        };
    } else if (temaSemanaList.length > 0) {
      const theme = temaSemanaList[0];
      weekThemeForPrimary = {
        modality: theme.modality,
        title: theme.title,
        course_id: theme.course_id,
        video_url: (theme as { video_url?: string | null }).video_url ?? null,
      };
    }

    if (missions.length > 0) {
      const m = missions[0];
      nextMission = { id: m.id, name: m.name, description: m.description, xpReward: m.xpReward };
    }

    const latestComment = latestCommentRes.data;
    const latestEval = latestEvalRes.data as {
      note?: string | null;
      coachId?: string | null;
      created_at?: string | null;
    } | null;

    let sharedCommentContent: string | null = null;
    let sharedCommentCoachName: string | null = null;
    let sharedCommentDate: string | null = null;
    if (latestComment?.content) {
      sharedCommentContent = latestComment.content;
      sharedCommentDate = latestComment.createdAt;
      if (latestComment.authorCoachId) {
        const { data: coach } = await supabase
          .from("Coach")
          .select("userId")
          .eq("id", latestComment.authorCoachId)
          .single();
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
      const { data: coachRow } = await supabase
        .from("Coach")
        .select("userId")
        .eq("id", latestEval.coachId)
        .single();
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
        homeFeedbackResolved.source === "comment" ? sharedCommentDate : lastEvalDate;
      coachFeedback = {
        content: homeFeedbackResolved.quote,
        coachName: homeFeedbackResolved.coachName ?? "Treinador",
        date: dateStr ?? new Date().toISOString(),
      };
    }
  }

  const beltLabel = athleteStats?.currentBelt
    ? t(("belt_" + athleteStats.currentBelt) as "belt_WHITE")
    : "—";

  return (
    <>
      <WarriorPanel
        studentName={dbUser?.name ?? null}
        currentBelt={athleteStats?.currentBelt ?? null}
        currentXP={athleteStats?.currentXP ?? 0}
        nextLevelXP={athleteStats?.nextLevelXP ?? 1000}
        totalPresences={totalPresences}
        currentMonthCount={currentMonthCount}
        attendanceGoal={attendanceGoal}
        hasCheckIn={hasCheckIn}
        hasPerformanceTracking={hasPerformanceTracking}
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

      <ExploreSection
        hasPerformanceTracking={hasPerformanceTracking}
        t={t as (key: string) => string}
      />
    </>
  );
}
