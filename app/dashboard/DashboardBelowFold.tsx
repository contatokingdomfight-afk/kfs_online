import { createClient } from "@/lib/supabase/server";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getTranslations } from "@/lib/i18n";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import { getWeekStartMondayLisbon } from "@/lib/lisbon-week";
import { normalizeModalityCode } from "@/lib/modality-normalize";
import { getApplicableMissionTemplates } from "@/lib/missions";
import { syncAthleteDisplayBelt } from "@/lib/sync-athlete-display-belt";
import { resolveCoachFeedbackForStudentView } from "@/lib/resolve-coach-feedback";
import { evaluationHasFeedbackContent } from "@/lib/athlete-evaluation-content";
import type { ReactNode } from "react";
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
  /** Carrossel «Nesta semana — aulas livres» (só com plano; fica após o Painel do guerreiro). */
  openClassesSlot: ReactNode | null;
};

export async function DashboardBelowFold({
  studentId,
  studentPrimaryModality,
  hasPlan,
  hasCheckIn,
  hasPerformanceTracking,
  openClassesSlot,
}: Props) {
  if (!hasPlan) return null;

  const [locale, supabase, dbUser] = await Promise.all([
    getLocaleFromCookies(),
    createClient(),
    getCurrentDbUser(),
  ]);
  const t = getTranslations(locale as "pt" | "en");
  /** Alinhar a `WeekTheme.week_start` com o calendário em Lisboa (evita desvio UTC no servidor). */
  const weekStart = getWeekStartMondayLisbon();
  const monthStart = new Date().toISOString().slice(0, 7) + "-01";
  const monthEnd = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    0,
  ).toISOString().slice(0, 10);

  let athleteStats: { currentBelt: string | null; currentXP: number; nextLevelXP: number } | null = null;
  let nextMission: { id: string; name: string; description: string | null; xpReward: number } | null = null;
  let coachFeedback: { content: string; coachName: string; date: string } | null = null;
  let totalPresences = 0;
  let currentMonthCount = 0;
  let attendanceGoal = 10;

  const [goalRes, athleteRes, weekThemesRes, activeMissionTemplateCountRes] = await Promise.all([
    supabase.from("AttendanceGoal").select("target_value").eq("is_global", true).limit(1).single(),
    studentId
      ? supabase
          .from("Athlete")
          .select("id, currentBelt, currentXP, xp, displayBeltIndex, lastBeltPromotionAt, createdAt")
          .eq("studentId", studentId)
          /** Não usar maybeSingle: com 2+ linhas (dados legados) o PostgREST devolve erro e data=null. */
          .order("createdAt", { ascending: true })
          .limit(1)
      : Promise.resolve({ data: [] }),
    supabase
      .from("WeekTheme")
      .select("modality, title, course_id, video_url")
      .eq("week_start", weekStart)
      .order("modality", { ascending: true }),
    supabase.from("MissionTemplate").select("id", { count: "exact", head: true }).eq("isActive", true),
  ]);
  const activeMissionTemplateCount = activeMissionTemplateCountRes.count ?? 0;

  type AthleteRow = {
    id: string;
    currentBelt: string | null;
    currentXP: number | null;
    xp: number | null;
    displayBeltIndex: number | null;
    lastBeltPromotionAt: string | null;
    createdAt: string;
  };
  const athleteList = athleteRes.data as AthleteRow[] | null;
  const athlete: AthleteRow | null = athleteList?.[0] ?? null;

  if (goalRes.data) attendanceGoal = goalRes.data.target_value ?? 10;

  const temaSemanaList = weekThemesRes.data ?? [];

  /**
   * Tema a mostrar no dashboard: linhas `WeekTheme` com `week_start` = segunda em Lisboa.
   * 1) Preferir modalidade primária do aluno (já normalizada no page) vs `WeekTheme.modality` (normalizado aqui).
   * 2) Sem match ou sem primária: primeiro registo (ordem por modality na query).
   * 3) Sem linhas: null → UI «Nenhum tema…».
   */
  const pickWeekThemeForStudent = (): {
    modality: string;
    title: string;
    course_id: string | null;
    video_url: string | null;
  } | null => {
    if (temaSemanaList.length === 0) return null;
    if (studentPrimaryModality) {
      const theme = temaSemanaList.find(
        (th) => normalizeModalityCode((th as { modality?: string }).modality) === studentPrimaryModality
      );
      if (theme) {
        return {
          modality: theme.modality,
          title: theme.title,
          course_id: theme.course_id,
          video_url: (theme as { video_url?: string | null }).video_url ?? null,
        };
      }
    }
    const theme = temaSemanaList[0];
    return {
      modality: theme.modality,
      title: theme.title,
      course_id: theme.course_id,
      video_url: (theme as { video_url?: string | null }).video_url ?? null,
    };
  };

  let weekThemeForPrimary: {
    modality: string;
    title: string;
    course_id: string | null;
    video_url: string | null;
  } | null = pickWeekThemeForStudent();

  if (studentId) {
    const attBase = () =>
      supabase
        .from("Attendance")
        .select("id", { count: "exact", head: true })
        .eq("studentId", studentId)
        .eq("status", "CONFIRMED")
        .eq("countsForGamification", true);
    const [{ count: monthAttCount }, { count: totalAttCount }] = await Promise.all([
      attBase().gte("occurrenceDate", monthStart).lte("occurrenceDate", monthEnd),
      attBase(),
    ]);
    currentMonthCount = monthAttCount ?? 0;
    totalPresences = totalAttCount ?? 0;
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

    const [missions, latestCommentRes, latestEvalRes] = await Promise.all([
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
        .select("note, coachId, created_at, gas, technique, strength, theory, scores, modality")
        .eq("athleteId", athlete.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (missions.length > 0) {
      const m = missions[0];
      nextMission = { id: m.id, name: m.name, description: m.description, xpReward: m.xpReward };
    }

    const latestComment = latestCommentRes.data;
    const latestEval = latestEvalRes.data as {
      note?: string | null;
      coachId?: string | null;
      created_at?: string | null;
      gas?: number | null;
      technique?: number | null;
      strength?: number | null;
      theory?: number | null;
      scores?: unknown;
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
    if (latestEval?.coachId && evaluationHasFeedbackContent(latestEval)) {
      lastEvalDate = latestEval.created_at ?? null;
      if (latestEval.note?.trim()) {
        lastEvalNote = latestEval.note ?? null;
      } else {
        lastEvalNote = t("dashboardFeedbackEvalScoresOnly");
      }
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

  const noMissionsMessage = !athlete
    ? t("dashboardNoMissionsNoAthlete")
    : activeMissionTemplateCount === 0
      ? t("dashboardMissionsNotConfigured")
      : t("dashboardNoMissions");

  const noCoachFeedbackMessage = !athlete
    ? t("dashboardNoFeedbackNeedAthlete")
    : t("dashboardNoCoachFeedback");

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

      {openClassesSlot}

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
          noMissions: noMissionsMessage,
          noCoachFeedback: noCoachFeedbackMessage,
          viewPerformanceLink: t("myPerformance"),
        }}
      />

      <ExploreSection
        hasPerformanceTracking={hasPerformanceTracking}
        t={t as (key: string) => string}
      />
    </>
  );
}
