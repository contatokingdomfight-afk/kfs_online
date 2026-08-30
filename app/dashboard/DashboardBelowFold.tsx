import { createClient } from "@/lib/supabase/server";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getTranslations } from "@/lib/i18n";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import { getWeekStartMondayLisbon, getTodayWeekdayMon1Lisbon } from "@/lib/lisbon-week";
import { getWeekThemeDaysForWeek } from "@/lib/week-theme-days";
import { getMonthThemesForMonth } from "@/lib/month-theme";
import { normalizeModalityCode } from "@/lib/modality-normalize";
import { syncAthleteDisplayBelt } from "@/lib/sync-athlete-display-belt";
import { resolveCoachFeedbackForStudentView } from "@/lib/resolve-coach-feedback";
import { getWarriorBeltBarFromAthleteState } from "@/lib/athlete-warrior-stats";
import { FALLBACK_COACH_ENCOURAGEMENT } from "@/lib/coach-feedback-defaults";
import { getWhatIsNewNextMission } from "@/lib/whatisnew-next-mission.server";
import type { ReactNode } from "react";
import { WarriorPanel } from "./WarriorPanel";
import { WhatIsNew } from "./WhatIsNew";
import { ExploreSection } from "./ExploreSection";

type Props = {
  studentId: string | null;
  studentPrimaryModality: string | null;
  hasPlan: boolean;
  hasCheckIn: boolean;
  hasPerformanceTracking: boolean;
  /** Carrossel «Nesta semana — aulas livres» (só com plano; fica após o Painel do guerreiro). */
  openClassesSlot: ReactNode | null;
  /** Próximos eventos — antes da secção Explorar. */
  upcomingEventsSlot: ReactNode | null;
};

export async function DashboardBelowFold({
  studentId,
  studentPrimaryModality,
  hasPlan,
  hasCheckIn,
  hasPerformanceTracking,
  openClassesSlot,
  upcomingEventsSlot,
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

  const [goalRes, athleteRes, weekThemesRes, weekThemeDays, monthThemesList] = await Promise.all([
    supabase.from("AttendanceGoal").select("target_value").eq("is_global", true).limit(1).single(),
    studentId
      ? supabase
          .from("Athlete")
          /** Sem currentBelt/currentXP na BD (só xp + displayBeltIndex); colunas inexistentes falham a query. */
          .select("id, xp, displayBeltIndex, lastBeltPromotionAt, createdAt")
          .eq("studentId", studentId)
          /** Não usar maybeSingle: com 2+ linhas (dados legados) o PostgREST devolve erro e data=null. */
          .order("createdAt", { ascending: true })
          .limit(1)
      : Promise.resolve({ data: [] }),
    supabase
      .from("WeekTheme")
      .select("modality, title, description, course_id, unit_id, video_url")
      .eq("week_start", weekStart)
      .order("modality", { ascending: true }),
    getWeekThemeDaysForWeek(supabase, weekStart),
    getMonthThemesForMonth(supabase, monthStart),
  ]);

  type AthleteRow = {
    id: string;
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
   * Tema a mostrar no dashboard: linhas `WeekTheme` (semana, Segunda em Lisboa) com
   * fallback para `MonthTheme` (mês) quando a semana não tem título próprio.
   * 1) Modalidade: preferir a primária do aluno se tiver linha na semana OU no mês;
   *    senão, primeira linha disponível (semana antes de mês).
   * 2) Título/descrição: se a semana tiver título preenchido, usa-os; senão usa os do
   *    mês (se existirem); vídeo/curso ficam sempre ligados à linha da semana.
   * 3) Sem nenhuma linha: null → UI «Nenhum tema…».
   */
  /** Compara códigos de modalidade tolerando variantes (via normalizeModalityCode) e, na ausência de alias, igualdade literal. */
  const modalityMatches = (a: string | null | undefined, b: string | null | undefined): boolean => {
    if (!a || !b) return false;
    const na = normalizeModalityCode(a);
    const nb = normalizeModalityCode(b);
    if (na && nb) return na === nb;
    return a === b;
  };

  const resolveThemeModality = (): string | null => {
    if (
      studentPrimaryModality &&
      (temaSemanaList.some((th) => modalityMatches((th as { modality?: string }).modality, studentPrimaryModality)) ||
        monthThemesList.some((th) => modalityMatches(th.modality, studentPrimaryModality)))
    ) {
      return studentPrimaryModality;
    }
    if (temaSemanaList.length > 0) return temaSemanaList[0].modality;
    if (monthThemesList.length > 0) return monthThemesList[0].modality;
    return null;
  };

  const pickWeekThemeForStudent = (): {
    modality: string;
    title: string;
    description: string | null;
    course_id: string | null;
    unit_id: string | null;
    video_url: string | null;
  } | null => {
    const resolvedModality = resolveThemeModality();
    if (!resolvedModality) return null;

    const weekRow = temaSemanaList.find((th) => modalityMatches((th as { modality?: string }).modality, resolvedModality));
    const monthRow = monthThemesList.find((th) => modalityMatches(th.modality, resolvedModality));

    const weekTitle = weekRow?.title?.trim() ?? "";
    const monthHasContent = Boolean(monthRow?.title?.trim() || monthRow?.description?.trim());

    if (!weekTitle && monthHasContent) {
      return {
        modality: resolvedModality,
        title: monthRow?.title ?? "",
        description: monthRow?.description ?? null,
        course_id: weekRow?.course_id ?? null,
        unit_id: (weekRow as { unit_id?: string | null } | undefined)?.unit_id ?? null,
        video_url: (weekRow as { video_url?: string | null } | undefined)?.video_url ?? null,
      };
    }

    if (!weekRow) return null;
    return {
      modality: resolvedModality,
      title: weekRow.title,
      description: (weekRow as { description?: string | null }).description ?? null,
      course_id: weekRow.course_id,
      unit_id: (weekRow as { unit_id?: string | null }).unit_id ?? null,
      video_url: (weekRow as { video_url?: string | null }).video_url ?? null,
    };
  };

  let weekThemeForPrimary: {
    modality: string;
    title: string;
    description: string | null;
    course_id: string | null;
    unit_id: string | null;
    video_url: string | null;
  } | null = pickWeekThemeForStudent();

  const weekThemeDaysForPrimary = weekThemeForPrimary
    ? weekThemeDays
        .filter((d) => modalityMatches(d.modality, weekThemeForPrimary!.modality))
        .sort((a, b) => a.weekday - b.weekday)
        .map((d) => ({ weekday: d.weekday, topic: d.topic }))
    : [];
  const todayWeekday = getTodayWeekdayMon1Lisbon();

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
    const synced = await syncAthleteDisplayBelt(supabase, athlete.id);
    const xpTotal = synced?.xp ?? (athlete.xp ?? 0);
    const dIdx = synced?.displayBeltIndex ?? (athlete.displayBeltIndex ?? 0);
    const lastP = synced?.lastBeltPromotionAt ?? athlete.lastBeltPromotionAt;
    const created = synced?.createdAt ?? athlete.createdAt;
    athleteStats = getWarriorBeltBarFromAthleteState(xpTotal, dIdx, lastP, created);

    const xpForMissions = xpTotal;

    const [nextFromProfile, latestCommentRes, latestEvalRes] = await Promise.all([
      studentId
        ? getWhatIsNewNextMission(supabase, {
            studentId,
            athleteId: athlete.id,
            athleteXp: xpForMissions,
            primaryModality: studentPrimaryModality,
            displayBeltIndex: dIdx,
          })
        : Promise.resolve(null),
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
    if (nextFromProfile) {
      nextMission = {
        id: nextFromProfile.id,
        name: nextFromProfile.name,
        description: nextFromProfile.description,
        xpReward: nextFromProfile.xpReward,
      };
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
    if (latestEval?.coachId) {
      const rawNote = latestEval.note?.trim() ?? null;
      lastEvalNote = rawNote;
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
      const dateStr = homeFeedbackResolved.source === "comment" ? sharedCommentDate : lastEvalDate;
      coachFeedback = {
        content: homeFeedbackResolved.quote,
        coachName: homeFeedbackResolved.coachName ?? "Treinador",
        date: dateStr ?? new Date().toISOString(),
      };
    } else {
      coachFeedback = {
        content: FALLBACK_COACH_ENCOURAGEMENT,
        coachName: "Teu treinador",
        date: lastEvalDate ?? new Date().toISOString(),
      };
    }
  }

  const beltLabel = athleteStats?.currentBelt
    ? t(("belt_" + athleteStats.currentBelt) as "belt_WHITE")
    : "—";

  const noMissionsMessage = !athlete ? t("dashboardNoMissionsNoAthlete") : t("dashboardNoMissions");

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
        weekThemeDays={weekThemeDaysForPrimary}
        todayWeekday={todayWeekday}
        nextMission={nextMission}
        coachFeedback={coachFeedback}
        locale={locale as "pt" | "en"}
        labels={{
          title: t("dashboardWhatIsNewTitle"),
          tabTheme: t("dashboardTabWeekTheme"),
          tabMission: t("dashboardTabNextMission"),
          tabFeedback: t("dashboardTabLastFeedback"),
          viewTheory: t("dashboardViewTheory"),
          viewLesson: t("dashboardViewLesson"),
          viewVideo: t("dashboardViewVideo"),
          hideVideo: t("dashboardHideVideo"),
          noWeekTheme: t("dashboardNoWeekTheme"),
          weekThemeDaysSectionLabel: t("weekThemeDaysSectionLabel"),
          weekThemeTodayBadge: t("weekThemeTodayBadge"),
          viewAllMissions: t("dashboardViewAllMissions"),
          noMissions: noMissionsMessage,
          noCoachFeedback: noCoachFeedbackMessage,
          viewPerformanceLink: t("myPerformance"),
          viewFullMonthLink: t("studentTemaSemanaViewFullMonth"),
        }}
      />

      {upcomingEventsSlot}

      <ExploreSection
        hasPerformanceTracking={hasPerformanceTracking}
        t={t as (key: string) => string}
      />
    </>
  );
}
