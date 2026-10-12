import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentCoachId } from "@/lib/auth/get-current-coach";
import { getCurrentSchoolId } from "@/lib/auth/get-current-school";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { coachPresenceUrl, pickLastAndNextOccurrence } from "@/lib/coach-presence-shortcuts";
import { MODALITY_LABELS, formatNextLessonDate } from "@/lib/lesson-utils";
import { getCachedModalityRefs } from "@/lib/cached-reference-data";
import { getWeekStartMondayLisbon } from "@/lib/lisbon-week";
import { ymdAddDays } from "@/lib/lesson-occurrences";
import { loadCoachScheduleBundle } from "@/lib/coach-schedule-scope";
import { calendarDateLisbon, minutesSinceMidnightLisbon } from "@/lib/lesson-check-in-window";
import { getActiveSchoolAssistantForUserId } from "@/lib/school-assistant-coach";
import { getLessonIdsForCoach } from "@/lib/coach-lesson-ids";
import { getTodayTrialClassesForCoach, getTodayTrialClassesForAdmin } from "@/lib/today-trial-classes";
import { TodayTrialClassesHighlight } from "@/components/TodayTrialClassesHighlight";
import { PhysicalAssessmentRequestsCoachCard } from "./_components/PhysicalAssessmentRequestsCoachCard";
import { CoachUpcomingEventsCard } from "./_components/CoachUpcomingEventsCard";


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
  const supabase = await createClient();
  /** Student/User têm RLS restritivo; admin client para nomes dos atletas (como em coach/aula). */
  const userReadClient = getAdminClientOrNull().client ?? supabase;
  const schoolAssistant =
    dbUser?.role === "ALUNO" ? await getActiveSchoolAssistantForUserId(supabase, dbUser.id) : null;
  const isSchoolAssistantHome = Boolean(schoolAssistant);

  const [coachId, schoolId, locale, modalitiesList] = await Promise.all([
    getCurrentCoachId(),
    getCurrentSchoolId(),
    getLocaleFromCookies(),
    getCachedModalityRefs(supabase),
  ]);
  const modalityLabels: Record<string, string> = {
    ...MODALITY_LABELS,
    ...Object.fromEntries(modalitiesList.map((m) => [m.code, m.name ?? m.code])),
  };
  const t = getTranslations(locale as "pt" | "en");

  const now = new Date();
  const today = calendarDateLisbon(now);
  const nowMinutes = minutesSinceMidnightLisbon(now);
  const weekStart = getWeekStartMondayLisbon();

  const rangeStart = ymdAddDays(today, -21);
  const rangeEnd = ymdAddDays(today, 28);
  const { expanded: expandedRange } = await loadCoachScheduleBundle(
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
    const [{ data: attendances }, { count: trialsInLesson }] = await Promise.all([
      supabase
        .from("Attendance")
        .select("status, isExperimental")
        .eq("lessonId", focusLesson.id)
        .eq("occurrenceDate", focusLesson.occurrenceDate),
      supabase
        .from("TrialClass")
        .select("id", { count: "exact", head: true })
        .eq("lessonId", focusLesson.id)
        .eq("lessonDate", focusLesson.occurrenceDate)
        .eq("convertedToStudent", false),
    ]);

    const confirmed = (attendances ?? []).filter((a) => a.status === "CONFIRMED").length;
    const pending = (attendances ?? []).filter((a) => a.status === "PENDING").length;
    const experimentalFromAttendance = (attendances ?? []).filter(
      (a) => (a as { isExperimental?: boolean }).isExperimental
    ).length;
    const experimental = Math.max(experimentalFromAttendance, trialsInLesson ?? 0);
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

  const { data: trials } = await supabase
    .from("TrialClass")
    .select("id, name, modality, lessonDate, lessonId")
    .eq("convertedToStudent", false)
    .gte("lessonDate", today)
    .order("lessonDate", { ascending: true });

  const coachLessonIds = coachId ? await getLessonIdsForCoach(supabase, coachId) : new Set<string>();
  const todayTrials = !isSchoolAssistantHome
    ? coachId
      ? await getTodayTrialClassesForCoach(supabase, coachId, coachLessonIds)
      : dbUser?.role === "ADMIN"
        ? await getTodayTrialClassesForAdmin(supabase, schoolId)
        : []
    : [];

  /** Só na home: inscrições ainda sem aula associada. Com `lessonId`, aparecem na sessão (Presenças na aula). */
  const trialsForHomeCard = (trials ?? [])
    .filter((t) => {
      if (t.lessonId) return false;
      const ld = String(t.lessonDate).slice(0, 10);
      return ld >= today;
    })
    .map((t) => ({
      id: t.id,
      name: t.name,
      modality: t.modality as string,
      lessonDate: String(t.lessonDate),
    }));

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
        const { data: pendingStudents } = await userReadClient
          .from("Student")
          .select("id, userId")
          .in("id", pendingStudentIds);
        const pendingUserIds = [...new Set((pendingStudents ?? []).map((s) => s.userId))];
        const { data: pendingUsers } =
          pendingUserIds.length > 0
            ? await userReadClient.from("User").select("id, name").in("id", pendingUserIds)
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

  // --- Página inicial focada na aula: cartão da aula em foco, resto do dia e só os avisos que existem ---
  const attendeesReadClient = userReadClient;
  const todayIds = [...new Set(lessonsList.map((l) => l.id))];
  const { data: todayAtt } = todayIds.length
    ? await attendeesReadClient
        .from("Attendance")
        .select("lessonId, studentId, status")
        .in("lessonId", todayIds)
        .eq("occurrenceDate", today)
        .in("status", ["PENDING", "CONFIRMED"])
    : { data: [] };
  const goingBy = new Map<string, number>();
  const presentBy = new Map<string, number>();
  for (const a of (todayAtt ?? []) as { lessonId: string; status: string }[]) {
    goingBy.set(a.lessonId, (goingBy.get(a.lessonId) ?? 0) + 1);
    if (a.status === "CONFIRMED") presentBy.set(a.lessonId, (presentBy.get(a.lessonId) ?? 0) + 1);
  }

  // Na aula em foco: quantos vão, experimentais e quantos têm o seguro por pagar (aviso para lembrar).
  let focusStats: { going: number; trials: number; noInsurance: number } | null = null;
  if (focusLesson) {
    const ids = ((todayAtt ?? []) as { lessonId: string; studentId: string }[]).filter((a) => a.lessonId === focusLesson.id).map((a) => a.studentId);
    const [{ count: trialsCount }, { data: lateIns }] = await Promise.all([
      supabase.from("TrialClass").select("id", { count: "exact", head: true }).eq("lessonId", focusLesson.id).eq("lessonDate", focusLesson.occurrenceDate).eq("convertedToStudent", false),
      ids.length
        ? attendeesReadClient.from("Payment").select("studentId").eq("status", "LATE").eq("paymentType", "INSURANCE").in("studentId", ids)
        : Promise.resolve({ data: [] as { studentId: string }[] }),
    ]);
    focusStats = { going: ids.length, trials: trialsCount ?? 0, noInsurance: new Set(((lateIns ?? []) as { studentId: string }[]).map((p) => p.studentId)).size };
  }

  // Esforço por dar: aulas de hoje já terminadas (ou, sem nenhuma, a última dos últimos 2 dias)
  // com presentes sem RPE — mostra a mais recente que tenha alguém por avaliar.
  let rpeMissing: { count: number; href: string; label: string } | null = null;
  const endedToday = lessonsList.filter((l) => timeToMinutes(l.endTime) <= nowMinutes);
  const rpeCandidates: { lessonId: string; occurrenceDate: string }[] = endedToday.length
    ? endedToday.map((l) => ({ lessonId: l.id, occurrenceDate: l.occurrenceDate }))
    : lastOcc && lastOcc.occurrenceDate >= ymdAddDays(today, -2)
      ? [lastOcc]
      : [];
  if (rpeCandidates.length) {
    const { data: noRpe } = await attendeesReadClient
      .from("Attendance")
      .select("lessonId, occurrenceDate")
      .in("lessonId", [...new Set(rpeCandidates.map((c) => c.lessonId))])
      .in("occurrenceDate", [...new Set(rpeCandidates.map((c) => c.occurrenceDate))])
      .eq("status", "CONFIRMED")
      .is("rpe", null);
    const missingBy = new Map<string, number>();
    for (const r of (noRpe ?? []) as { lessonId: string; occurrenceDate: string }[]) {
      const k = `${r.lessonId}|${String(r.occurrenceDate).slice(0, 10)}`;
      missingBy.set(k, (missingBy.get(k) ?? 0) + 1);
    }
    const withMissing = rpeCandidates
      .map((c) => ({ c, n: missingBy.get(`${c.lessonId}|${c.occurrenceDate}`) ?? 0, occ: expandedRange.find((l) => l.id === c.lessonId && l.occurrenceDate === c.occurrenceDate) }))
      .filter((x) => x.n > 0 && x.occ)
      .sort((a, b) => (a.c.occurrenceDate + a.occ!.startTime).localeCompare(b.c.occurrenceDate + b.occ!.startTime));
    const pick = withMissing[withMissing.length - 1];
    if (pick) {
      rpeMissing = {
        count: pick.n,
        href: coachPresenceUrl(pick.c.lessonId, pick.c.occurrenceDate),
        label: `${pick.c.occurrenceDate === today ? "" : `${formatNextLessonDate(pick.c.occurrenceDate, locale as "pt" | "en")} · `}${pick.occ!.startTime.slice(0, 5)} ${modalityLabels[pick.occ!.modality ?? ""] ?? pick.occ!.modality ?? ""}`,
      };
    }
  }

  const pt = locale !== "en";
  const firstName = (dbUser?.name ?? "").trim().split(/\s+/)[0] || t("coach");
  const dateLabel = now.toLocaleDateString(pt ? "pt-PT" : "en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Lisbon" });
  const focusHref = focusLesson ? coachPresenceUrl(focusLesson.id, focusLesson.occurrenceDate) : nextPresenceHref;
  const nextOccRow = !focusLesson && nextOcc ? expandedRange.find((l) => l.id === nextOcc.lessonId && l.occurrenceDate === nextOcc.occurrenceDate) ?? null : null;
  const minutesToStart = focusLesson && scenario === "next" ? timeToMinutes(focusLesson.startTime) - nowMinutes : null;
  const heroKicker =
    scenario === "in_class" && focusLesson
      ? `${pt ? "A DECORRER · termina às" : "IN PROGRESS · ends at"} ${focusLesson.endTime.slice(0, 5)}`
      : scenario === "next" && minutesToStart != null
        ? minutesToStart <= 90
          ? `${pt ? "PRÓXIMA AULA · daqui a" : "NEXT CLASS · in"} ${minutesToStart} min`
          : pt
            ? "PRÓXIMA AULA · HOJE"
            : "NEXT CLASS · TODAY"
        : pt
          ? "SEM MAIS AULAS HOJE"
          : "NO MORE CLASSES TODAY";
  const otherToday = lessonsList.filter((l) => !focusLesson || l.id !== focusLesson.id).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const sectionLabel: React.CSSProperties = { margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-secondary)" };
  const rowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg-secondary)", textDecoration: "none", color: "var(--text-primary)", fontSize: 14 };
  const alertStyle = (tone: "amber" | "blue"): React.CSSProperties => ({
    ...rowStyle,
    background: tone === "amber" ? "rgba(250,204,21,0.10)" : "rgba(96,165,250,0.10)",
    border: `1px solid ${tone === "amber" ? "rgba(250,204,21,0.4)" : "rgba(96,165,250,0.4)"}`,
  });
  const hasAlerts = Boolean(rpeMissing) || trialsForHomeCard.length > 0 || physicalAssessmentPendingRows.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(16px, 4vw, 20px)", maxWidth: "min(560px, 100%)" }}>
      <header>
        <h1 style={{ margin: 0, fontSize: "clamp(22px, 5.5vw, 28px)", fontWeight: 800 }}>
          {pt ? "Olá" : "Hi"}, {firstName}
        </h1>
        <p style={{ margin: "2px 0 0", fontSize: 14, color: "var(--text-secondary)", textTransform: "capitalize" }}>{dateLabel}</p>
      </header>

      <section
        aria-label={pt ? "Aula em foco" : "Class in focus"}
        style={{ padding: "16px", borderRadius: 18, background: "color-mix(in srgb, var(--primary) 12%, var(--bg-secondary))", border: "1px solid color-mix(in srgb, var(--primary) 45%, transparent)", display: "flex", flexDirection: "column", gap: 10 }}
      >
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.05em", color: "var(--primary)" }}>{heroKicker}</span>
        {focusLesson ? (
          <>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{modalityLabels[focusLesson.modality] ?? focusLesson.modality}</div>
              <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>
                {focusLesson.startTime.slice(0, 5)}–{focusLesson.endTime.slice(0, 5)}
              </div>
            </div>
            {focusStats && (
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: "var(--text-secondary)" }}>
                <span>
                  <strong style={{ fontSize: 18, color: "var(--text-primary)" }}>{scenario === "in_class" ? presentBy.get(focusLesson.id) ?? 0 : focusStats.going}</strong> {scenario === "in_class" ? (pt ? "presentes" : "present") : pt ? "vão" : "going"}
                </span>
                {focusStats.trials > 0 && (
                  <span>
                    <strong style={{ fontSize: 18, color: "var(--text-primary)" }}>{focusStats.trials}</strong> {pt ? (focusStats.trials === 1 ? "experimental" : "experimentais") : "trial"}
                  </span>
                )}
                {focusStats.noInsurance > 0 && (
                  <span>
                    <strong style={{ fontSize: 18, color: "#eab308" }}>{focusStats.noInsurance}</strong> {pt ? "sem seguro pago" : "no insurance"}
                  </span>
                )}
              </div>
            )}
          </>
        ) : nextOccRow ? (
          <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            {pt ? "A próxima é" : "Next one:"}{" "}
            <strong style={{ color: "var(--text-primary)" }}>
              {modalityLabels[nextOccRow.modality ?? ""] ?? nextOccRow.modality} · {formatNextLessonDate(nextOccRow.occurrenceDate, locale as "pt" | "en")} {nextOccRow.startTime.slice(0, 5)}
            </strong>
          </div>
        ) : (
          <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>{t("coachRestMessage")}</div>
        )}
        {focusHref ? (
          <Link href={focusHref} className="btn btn-primary" style={{ minHeight: 50, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, textDecoration: "none" }}>
            {focusLesson ? (pt ? "Marcar presenças" : "Take attendance") : pt ? "Abrir a próxima aula" : "Open next class"}
          </Link>
        ) : null}
        {focusLesson && (
          <div style={{ display: "flex", gap: 8 }}>
            <Link href={`/coach/aula/qr?lesson=${focusLesson.id}&date=${encodeURIComponent(focusLesson.occurrenceDate)}`} className="btn btn-secondary" style={{ flex: 1, minHeight: 42, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", fontSize: 14 }}>
              {pt ? "QR check-in" : "QR check-in"}
            </Link>
            {!isSchoolAssistantHome && (
              <Link href="/coach/round-timer" className="btn btn-secondary" style={{ flex: 1, minHeight: 42, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", fontSize: 14 }}>
                {t("navRoundTimer")}
              </Link>
            )}
          </div>
        )}
      </section>

      {otherToday.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 style={sectionLabel}>{pt ? "Resto de hoje" : "Rest of today"}</h2>
          {otherToday.map((l) => {
            const ended = timeToMinutes(l.endTime) <= nowMinutes;
            const going = goingBy.get(l.id) ?? 0;
            const present = presentBy.get(l.id) ?? 0;
            return (
              <Link key={l.occurrenceKey ?? `${l.id}-${l.occurrenceDate}`} href={coachPresenceUrl(l.id, l.occurrenceDate)} style={{ ...rowStyle, opacity: ended ? 0.75 : 1 }}>
                <strong style={{ minWidth: 46 }}>{l.startTime.slice(0, 5)}</strong>
                <span style={{ flex: 1, minWidth: 0 }}>{modalityLabels[l.modality ?? ""] ?? l.modality}</span>
                <span style={{ fontSize: 13, color: ended ? "#22c55e" : "var(--text-secondary)" }}>
                  {ended ? `${present} ${pt ? "presentes" : "present"}` : `${going} ${pt ? (going === 1 ? "vai" : "vão") : "going"}`}
                </span>
              </Link>
            );
          })}
          <Link href="/coach/agenda" style={{ fontSize: 13, color: "var(--primary)", fontWeight: 700, textDecoration: "none", alignSelf: "flex-end" }}>
            {t("coachViewFullAgenda")}
          </Link>
        </section>
      )}

      {!isSchoolAssistantHome && todayTrials.length > 0 && (
        <TodayTrialClassesHighlight
          trials={todayTrials}
          modalityLabels={modalityLabels}
          labels={{
            title: t("todayTrialsTitle"),
            subtitle: t("todayTrialsSubtitle"),
            pendingBadge: t("todayTrialsPending"),
            acceptedBadge: t("todayTrialsAccepted"),
            viewAll: t("todayTrialsViewAll"),
            goToLesson: t("coachGoToLesson"),
          }}
          manageHref="/coach/experimentais"
          coachScope={coachId ? { lessonIds: coachLessonIds } : undefined}
        />
      )}

      {!isSchoolAssistantHome && hasAlerts && (
        <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 style={sectionLabel}>{pt ? "Precisa de ti" : "Needs you"}</h2>
          {rpeMissing && (
            <Link href={rpeMissing.href} style={alertStyle("amber")}>
              <span style={{ flex: 1, minWidth: 0 }}>
                {pt ? "Esforço da aula por dar" : "Class effort to rate"} · {rpeMissing.label} · {rpeMissing.count} {pt ? (rpeMissing.count === 1 ? "aluno" : "alunos") : "students"}
              </span>
              <strong style={{ color: "var(--primary)", fontSize: 13 }}>{pt ? "Dar" : "Rate"}</strong>
            </Link>
          )}
          {trialsForHomeCard.length > 0 && (
            <Link href="/coach/experimentais" style={alertStyle("blue")}>
              <span style={{ flex: 1, minWidth: 0 }}>
                {trialsForHomeCard.length} {pt ? (trialsForHomeCard.length === 1 ? "experimental por associar a uma aula" : "experimentais por associar a uma aula") : "trial classes without a class"}
              </span>
              <strong style={{ color: "var(--primary)", fontSize: 13 }}>{pt ? "Ver" : "View"}</strong>
            </Link>
          )}
          {physicalAssessmentPendingRows.length > 0 && (
            <PhysicalAssessmentRequestsCoachCard
              rows={physicalAssessmentPendingRows}
              title={t("coachPhysAssessRequestsTitle")}
              emptyMessage={t("coachPhysAssessRequestsEmpty")}
              openAssessmentLabel={t("coachPhysAssessOpenAssessment")}
              unnamedStudentLabel={t("coachAthleteUnnamed")}
              locale={locale as "pt" | "en"}
            />
          )}
        </section>
      )}

      {!isSchoolAssistantHome && (
        <Link href="/coach/tema-semana" style={rowStyle}>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t("navWeekTheme")} · {modalityLabels[mainModality] ?? mainModality}</span>
            <span style={{ display: "block", fontWeight: 700 }}>{theme?.title ?? t("coachNoThemeHint")}</span>
          </span>
          <span style={{ fontSize: 13, color: "var(--primary)", fontWeight: 700 }}>{theme ? (pt ? "editar" : "edit") : t("coachDefineTheme")}</span>
        </Link>
      )}

      <CoachUpcomingEventsCard locale={locale as "pt" | "en"} />
    </div>
  );
}
