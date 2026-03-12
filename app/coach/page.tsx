import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentCoachId } from "@/lib/auth/get-current-coach";
import { getCurrentSchoolId } from "@/lib/auth/get-current-school";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { MODALITY_LABELS, formatLessonDate, getWeekStartMonday } from "@/lib/lesson-utils";
import { CurrentOrNextClassCard } from "./_components/CurrentOrNextClassCard";
import { TodayScheduleCard } from "./_components/TodayScheduleCard";
import { WeekThemeCard } from "./_components/WeekThemeCard";
import { TrialClassesCard } from "./_components/TrialClassesCard";
import { MonitoredAthletesList } from "./_components/MonitoredAthletesList";

const LEVEL_LABEL: Record<string, string> = {
  INICIANTE: "Iniciante",
  INTERMEDIARIO: "Intermediário",
  AVANCADO: "Avançado",
};

/** Converte "HH:MM" ou "HH:MM:SS" em minutos desde meia-noite. */
function timeToMinutes(t: string): number {
  const parts = t.trim().split(/[:\s]/).map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  return h * 60 + m;
}

/** Determina cenário e aula em foco: in_class, next ou rest. */
function getCurrentOrNextScenario(
  todayLessons: { id: string; modality: string; startTime: string; endTime: string }[],
  nowMinutes: number
): { scenario: "in_class" | "next" | "rest"; lesson: (typeof todayLessons)[0] | null } {
  if (todayLessons.length === 0) {
    return { scenario: "rest", lesson: null };
  }

  for (const l of todayLessons) {
    const start = timeToMinutes(l.startTime);
    const end = timeToMinutes(l.endTime);
    if (nowMinutes >= start && nowMinutes < end) {
      return { scenario: "in_class", lesson: l };
    }
  }

  for (const l of todayLessons) {
    const start = timeToMinutes(l.startTime);
    if (nowMinutes < start) {
      return { scenario: "next", lesson: l };
    }
  }

  return { scenario: "rest", lesson: null };
}

export default async function CoachHomePage() {
  const dbUser = await getCurrentDbUser();
  const [coachId, schoolId, locale] = await Promise.all([
    getCurrentCoachId(),
    getCurrentSchoolId(),
    getLocaleFromCookies(),
  ]);
  const t = getTranslations(locale as "pt" | "en");
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const weekStart = getWeekStartMonday();

  // Aulas do coach hoje
  let todayLessonsQuery = supabase
    .from("Lesson")
    .select("id, modality, date, startTime, endTime")
    .eq("date", today)
    .order("startTime", { ascending: true });

  if (coachId) {
    todayLessonsQuery = todayLessonsQuery.eq("coachId", coachId);
  }
  if (schoolId) {
    todayLessonsQuery = todayLessonsQuery.eq("schoolId", schoolId);
  }

  const { data: todayLessons } = await todayLessonsQuery;
  const lessonsList = todayLessons ?? [];

  const { scenario, lesson: focusLesson } = getCurrentOrNextScenario(lessonsList, nowMinutes);

  // Sumário de presenças para a aula em foco
  let attendanceSummary = "";
  if (focusLesson) {
    const { data: attendances } = await supabase
      .from("Attendance")
      .select("status, isExperimental")
      .eq("lessonId", focusLesson.id);

    const confirmed = (attendances ?? []).filter((a) => a.status === "CONFIRMED").length;
    const pending = (attendances ?? []).filter((a) => a.status === "PENDING").length;
    const experimental = (attendances ?? []).filter((a) => (a as { isExperimental?: boolean }).isExperimental).length;
    const withIntent = confirmed + pending;
    const parts: string[] = [];
    if (withIntent > 0) {
      parts.push(
        locale === "pt"
          ? `${withIntent} com intenção de vir`
          : `${withIntent} planning to attend`
      );
    }
    if (experimental > 0) {
      parts.push(
        locale === "pt"
          ? `${experimental} experimentais agendados`
          : `${experimental} trial classes scheduled`
      );
    }
    attendanceSummary = parts.join(", ") || (locale === "pt" ? "Sem presenças ainda." : "No presences yet.");
  }

  // Resto do dia: aulas que ainda não começaram
  const restOfDayLessons = lessonsList.filter((l) => {
    const start = timeToMinutes(l.startTime);
    return nowMinutes < start;
  });

  // Modalidade principal do coach (para Tema da Semana)
  let mainModality = "MUAY_THAI";
  if (coachId) {
    const { data: coach } = await supabase
      .from("Coach")
      .select("specialties")
      .eq("id", coachId)
      .single();
    const specialties = (coach?.specialties as string) ?? "";
    const first = specialties.split(/[,;]/)[0]?.trim();
    if (first && ["MUAY_THAI", "BOXING", "KICKBOXING"].includes(first)) {
      mainModality = first;
    } else if (lessonsList.length > 0) {
      mainModality = lessonsList[0].modality;
    }
  }

  // Tema da semana para modalidade principal
  const { data: weekThemes } = await supabase
    .from("WeekTheme")
    .select("modality, title")
    .eq("week_start", weekStart)
    .eq("modality", mainModality);
  const theme = weekThemes?.[0] ?? null;

  // Experimentais nas aulas do coach (não convertidos, data >= hoje)
  let trialLessons: { id: string; modality: string; date: string; startTime: string; endTime: string }[] = [];
  if (coachId || schoolId) {
    let lessonsForTrials = supabase
      .from("Lesson")
      .select("id, modality, date, startTime, endTime")
      .gte("date", today)
      .order("date", { ascending: true })
      .order("startTime", { ascending: true })
      .limit(50);
    if (coachId) lessonsForTrials = lessonsForTrials.eq("coachId", coachId);
    if (schoolId) lessonsForTrials = lessonsForTrials.eq("schoolId", schoolId);
    const { data: coachLessons } = await lessonsForTrials;
    trialLessons = coachLessons ?? [];
  }

  const coachLessonIds = new Set(trialLessons.map((l) => l.id));
  const { data: trials } = await supabase
    .from("TrialClass")
    .select("id, name, modality, lessonDate, lessonId")
    .eq("convertedToStudent", false)
    .gte("lessonDate", today)
    .order("lessonDate", { ascending: true });

  const coachTrials = (trials ?? []).filter((t) => t.lessonId && coachLessonIds.has(t.lessonId));
  const lessonById = new Map(trialLessons.map((l) => [l.id, l]));
  const trialsWithLesson = coachTrials.map((t) => {
    const lesson = t.lessonId ? lessonById.get(t.lessonId) : null;
    return {
      id: t.id,
      name: t.name,
      modality: t.modality,
      lessonDate: String(t.lessonDate),
      startTime: lesson?.startTime,
      endTime: lesson?.endTime,
    };
  });

  // Atletas do coach (mainCoachId)
  let athletesQuery = supabase
    .from("Athlete")
    .select("id, studentId, level")
    .order("id");
  if (coachId) {
    athletesQuery = athletesQuery.eq("mainCoachId", coachId);
  }
  const { data: athletes } = await athletesQuery;
  const athleteList = athletes ?? [];

  const studentIds = athleteList.map((a) => a.studentId);
  const { data: students } =
    studentIds.length > 0
      ? await supabase.from("Student").select("id, userId").in("id", studentIds)
      : { data: [] };
  const userIds = [...new Set((students ?? []).map((s) => s.userId))];
  const { data: users } =
    userIds.length > 0 ? await supabase.from("User").select("id, name").in("id", userIds) : { data: [] };
  const userById = new Map((users ?? []).map((u) => [u.id, u]));
  const studentToUser = new Map((students ?? []).map((s) => [s.id, userById.get(s.userId)]));

  const athletesWithNames = athleteList.map((a) => {
    const u = studentToUser.get(a.studentId);
    return {
      studentId: a.studentId,
      name: u?.name ?? null,
      level: a.level,
    };
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "clamp(20px, 5vw, 24px)",
        maxWidth: "min(520px, 100%)",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: "clamp(15px, 3.8vw, 17px)",
          color: "var(--text-secondary)",
        }}
      >
        {t("helloCoach")} {dbUser?.name || t("coach")} 👋
      </p>

      {/* Secção 1: FOCO ATUAL */}
      <CurrentOrNextClassCard
        scenario={scenario}
        lesson={focusLesson}
        modalityLabel={focusLesson ? MODALITY_LABELS[focusLesson.modality] ?? focusLesson.modality : ""}
        summary={attendanceSummary}
        manageLabel={t("coachManageClassNow")}
        restMessage={t("coachRestMessage")}
      />

      {/* Secção 2: PREPARAÇÃO E PLANEAMENTO */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "clamp(12px, 3vw, 16px)",
        }}
      >
        <TodayScheduleCard
          lessons={restOfDayLessons}
          modalityLabels={MODALITY_LABELS}
          title={t("coachRestOfDay")}
          viewAgendaLabel={t("coachViewFullAgenda")}
          noLessonsLabel={t("coachNoLessonsRestToday")}
        />
        <WeekThemeCard
          title={t("navWeekTheme")}
          themeTitle={theme?.title ?? null}
          modalityLabel={MODALITY_LABELS[mainModality] ?? mainModality}
          defineLabel={t("coachDefineTheme")}
          noThemeHint={t("coachNoThemeHint")}
        />
        <TrialClassesCard
          trials={trialsWithLesson}
          modalityLabels={MODALITY_LABELS}
          title={t("coachTrialClasses")}
          manageAllLabel={t("coachManageAllTrials")}
          emptyMessage={t("coachTrialClassesEmpty")}
          formatDate={(d) => formatLessonDate(d)}
        />
      </div>

      {/* Secção 3: ACOMPANHAMENTO DE ATLETAS */}
      <MonitoredAthletesList
        athletes={athletesWithNames}
        title={t("coachYourAthletes")}
        searchPlaceholder={t("coachSearchAthletes")}
        levelLabels={LEVEL_LABEL}
        emptyMessage={t("coachNoAthletes")}
        noResultsMessage={t("coachNoSearchResults")}
      />
    </div>
  );
}
