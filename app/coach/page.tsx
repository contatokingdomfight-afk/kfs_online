import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentCoachId } from "@/lib/auth/get-current-coach";
import { getCurrentSchoolId } from "@/lib/auth/get-current-school";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { coachPresenceUrl, pickLastAndNextOccurrence } from "@/lib/coach-presence-shortcuts";
import { MODALITY_LABELS, formatLessonDate, formatNextLessonDate } from "@/lib/lesson-utils";
import { getWeekStartMondayLisbon } from "@/lib/lisbon-week";
import { ymdAddDays } from "@/lib/lesson-occurrences";
import { loadCoachScheduleBundle } from "@/lib/coach-schedule-scope";
import { calendarDateLisbon, minutesSinceMidnightLisbon } from "@/lib/lesson-check-in-window";
import { CurrentOrNextClassCard } from "./_components/CurrentOrNextClassCard";
import { TodayScheduleCard } from "./_components/TodayScheduleCard";
import { WeekThemeCard } from "./_components/WeekThemeCard";
import { TrialClassesCard } from "./_components/TrialClassesCard";
import { MonitoredAthletesList } from "./_components/MonitoredAthletesList";
import { PhysicalAssessmentRequestsCoachCard } from "./_components/PhysicalAssessmentRequestsCoachCard";

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
  todayLessons: { id: string; modality: string | null; startTime: string; endTime: string; occurrenceDate: string }[],
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

  const now = new Date();
  const today = calendarDateLisbon(now);
  const nowMinutes = minutesSinceMidnightLisbon(now);
  const weekStart = getWeekStartMondayLisbon();

  const rangeStart = ymdAddDays(today, -21);
  const rangeEnd = ymdAddDays(today, 28);
  const { defs, expanded: expandedRange } = await loadCoachScheduleBundle(
    supabase,
    coachId,
    schoolId,
    rangeStart,
    rangeEnd
  );
  const lessonsList = expandedRange.filter((l) => l.occurrenceDate === today);
  const { last: lastOcc, next: nextOcc } = pickLastAndNextOccurrence(expandedRange, now);
  const lastPresenceHref = lastOcc ? coachPresenceUrl(lastOcc.lessonId, lastOcc.occurrenceDate) : null;
  const nextPresenceHref = nextOcc ? coachPresenceUrl(nextOcc.lessonId, nextOcc.occurrenceDate) : null;

  const { scenario, lesson: focusLessonRaw } = getCurrentOrNextScenario(lessonsList, nowMinutes);
  const focusLesson = focusLessonRaw
    ? {
        id: focusLessonRaw.id,
        modality: focusLessonRaw.modality ?? "",
        startTime: focusLessonRaw.startTime,
        endTime: focusLessonRaw.endTime,
        occurrenceDate: focusLessonRaw.occurrenceDate,
      }
    : null;

  // Sumário de presenças para a aula em foco
  let attendanceSummary = "";
  if (focusLesson && focusLesson.occurrenceDate) {
    const { data: attendances } = await supabase
      .from("Attendance")
      .select("status, isExperimental")
      .eq("lessonId", focusLesson.id)
      .eq("occurrenceDate", focusLesson.occurrenceDate);

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
  const restOfDayLessons = lessonsList
    .filter((l) => {
      const start = timeToMinutes(l.startTime);
      return nowMinutes < start;
    })
    .map((l) => ({
      id: l.id,
      modality: l.modality ?? "",
      startTime: l.startTime,
      endTime: l.endTime,
      occurrenceDate: l.occurrenceDate,
    }));

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
    if (first && ["MUAY_THAI", "BOXING", "KICKBOXING", "MMA"].includes(first)) {
      mainModality = first;
    } else if (lessonsList.length > 0) {
      mainModality = lessonsList[0].modality ?? "MUAY_THAI";
    }
  }

  // Tema da semana para modalidade principal
  const { data: weekThemes } = await supabase
    .from("WeekTheme")
    .select("modality, title")
    .eq("week_start", weekStart)
    .eq("modality", mainModality);
  const theme = weekThemes?.[0] ?? null;

  const trialLessons =
    defs.length > 0
      ? defs.map((l) => ({
          id: l.id,
          modality: l.modality ?? "",
          startTime: l.startTime,
          endTime: l.endTime,
        }))
      : [];

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
    .select("id, studentId, level, createdAt")
    .order("id");
  if (coachId) {
    athletesQuery = athletesQuery.eq("mainCoachId", coachId);
  }
  const { data: athletes } = await athletesQuery;
  const rawAthleteList = athletes ?? [];
  /** Um aluno = uma linha: podem existir 2+ `Athlete` com o mesmo `studentId` (legado). */
  const athleteList = (() => {
    const byStudent = new Map<string, (typeof rawAthleteList)[0]>();
    for (const a of rawAthleteList) {
      const sid = a.studentId;
      const prev = byStudent.get(sid);
      if (!prev) {
        byStudent.set(sid, a);
        continue;
      }
      const aT = (a as { createdAt?: string }).createdAt ?? "";
      const pT = (prev as { createdAt?: string }).createdAt ?? "";
      if (aT > pT || (aT === pT && String(a.id) > String(prev.id))) {
        byStudent.set(sid, a);
      }
    }
    return [...byStudent.values()];
  })();

  const studentIds = athleteList.map((a) => a.studentId);
  const { data: students } =
    studentIds.length > 0
      ? await supabase.from("Student").select("id, userId").in("id", studentIds)
      : { data: [] };
  const userIds = [...new Set((students ?? []).map((s) => s.userId))];
  const { data: users } =
    userIds.length > 0
      ? await supabase.from("User").select("id, name, email").in("id", userIds)
      : { data: [] };
  const userById = new Map(
    (users ?? []).map((u) => [u.id, u as { id: string; name: string | null; email: string }])
  );
  const studentToUser = new Map((students ?? []).map((s) => [s.id, userById.get(s.userId)]));

  const athletesWithNames = athleteList.map((a) => {
    const u = studentToUser.get(a.studentId);
    return {
      studentId: a.studentId,
      name: u?.name ?? null,
      email: u?.email ?? null,
      level: a.level,
    };
  });

  let physicalAssessmentPendingRows: {
    id: string;
    createdAt: string;
    note: string | null;
    studentId: string;
    studentName: string | null;
  }[] = [];
  if (coachId) {
    const { data: coachSchoolLinks } = await supabase.from("CoachSchool").select("schoolId").eq("coachId", coachId);
    const coachSchoolIds = [...new Set((coachSchoolLinks ?? []).map((l) => l.schoolId).filter(Boolean))] as string[];
    if (coachSchoolIds.length > 0) {
      const { data: physReqRows } = await supabase
        .from("PhysicalAssessmentRequest")
        .select("id, createdAt, note, studentId")
        .in("schoolId", coachSchoolIds)
        .eq("status", "PENDING")
        .order("createdAt", { ascending: false })
        .limit(40);
      const pendingStudentIds = [...new Set((physReqRows ?? []).map((r) => r.studentId))];
      const nameByStudentId = new Map<string, string | null>();
      if (pendingStudentIds.length > 0) {
        const { data: pendingStudents } = await supabase
          .from("Student")
          .select("id, userId")
          .in("id", pendingStudentIds);
        const pendingUserIds = [...new Set((pendingStudents ?? []).map((s) => s.userId))];
        const { data: pendingUsers } =
          pendingUserIds.length > 0
            ? await supabase.from("User").select("id, name").in("id", pendingUserIds)
            : { data: [] };
        const nameByUserId = new Map((pendingUsers ?? []).map((u) => [u.id, u.name as string | null]));
        for (const s of pendingStudents ?? []) {
          nameByStudentId.set(s.id, nameByUserId.get(s.userId) ?? null);
        }
      }
      physicalAssessmentPendingRows = (physReqRows ?? []).map((r) => ({
        id: r.id,
        createdAt: String(r.createdAt),
        note: r.note,
        studentId: r.studentId,
        studentName: nameByStudentId.get(r.studentId) ?? null,
      }));
    }
  }

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

      <Link
        href="/coach/aula"
        className="card"
        style={{
          display: "block",
          padding: "clamp(14px, 3.5vw, 18px) clamp(16px, 4vw, 20px)",
          textDecoration: "none",
          borderLeft: "4px solid var(--primary)",
          fontWeight: 600,
          fontSize: "clamp(15px, 3.8vw, 17px)",
          color: "var(--text-primary)",
        }}
      >
        {t("navRoundTimer")}
        <span
          style={{
            display: "block",
            marginTop: 6,
            fontSize: "clamp(13px, 3.2vw, 14px)",
            fontWeight: 400,
            color: "var(--text-secondary)",
          }}
        >
          {t("coachRoundTimerCardCta")}
        </span>
      </Link>

      <section
        className="card"
        style={{
          padding: "clamp(16px, 4vw, 20px)",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(10px, 2.5vw, 12px)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "clamp(12px, 3vw, 13px)",
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "var(--text-secondary)",
          }}
        >
          {t("coachPresenceShortcutsTitle")}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {nextPresenceHref && nextOcc ? (
            <Link
              href={nextPresenceHref}
              className="btn btn-primary"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 4,
                textDecoration: "none",
                fontSize: "clamp(15px, 3.8vw, 17px)",
                padding: "clamp(12px, 3vw, 14px) clamp(16px, 4vw, 20px)",
              }}
            >
              <span>{t("coachPresenceShortcutNext")}</span>
              <span style={{ fontSize: "clamp(13px, 3.2vw, 14px)", fontWeight: 400, opacity: 0.92 }}>
                {formatNextLessonDate(nextOcc.occurrenceDate, locale as "pt" | "en")}
              </span>
            </Link>
          ) : (
            <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 15px)", color: "var(--text-secondary)" }}>
              {t("coachPresenceShortcutNextNone")}
            </p>
          )}
          {lastPresenceHref && lastOcc ? (
            <Link
              href={lastPresenceHref}
              className="btn btn-secondary"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 4,
                textDecoration: "none",
                fontSize: "clamp(15px, 3.8vw, 17px)",
                padding: "clamp(12px, 3vw, 14px) clamp(16px, 4vw, 20px)",
              }}
            >
              <span>{t("coachPresenceShortcutLast")}</span>
              <span style={{ fontSize: "clamp(13px, 3.2vw, 14px)", fontWeight: 400, opacity: 0.92 }}>
                {formatNextLessonDate(lastOcc.occurrenceDate, locale as "pt" | "en")}
              </span>
            </Link>
          ) : (
            <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 15px)", color: "var(--text-secondary)" }}>
              {t("coachPresenceShortcutLastNone")}
            </p>
          )}
        </div>
      </section>

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

      <PhysicalAssessmentRequestsCoachCard
        rows={physicalAssessmentPendingRows}
        title={t("coachPhysAssessRequestsTitle")}
        emptyMessage={t("coachPhysAssessRequestsEmpty")}
        openAssessmentLabel={t("coachPhysAssessOpenAssessment")}
        unnamedStudentLabel={t("coachAthleteUnnamed")}
        locale={locale as "pt" | "en"}
      />

      {/* Secção 3: ACOMPANHAMENTO DE ATLETAS */}
      <MonitoredAthletesList
        athletes={athletesWithNames}
        title={t("coachYourAthletes")}
        searchPlaceholder={t("coachSearchAthletes")}
        levelLabels={LEVEL_LABEL}
        unnamedAthleteLabel={t("coachAthleteUnnamed")}
        emptyMessage={t("coachNoAthletes")}
        noResultsMessage={t("coachNoSearchResults")}
      />
    </div>
  );
}
