import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/auth/sync-user";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { getThisWeekRange, formatLessonDate, MODALITY_LABELS, getWeekStartMonday } from "@/lib/lesson-utils";
import { getAttendanceByModality, GENERAL_PERFORMANCE_AXES, computeGeneralPerformanceScores } from "@/lib/performance-utils";
import { getEarnedBadges } from "@/lib/gamification";
import { VouNaoVouButtons } from "./VouNaoVouButtons";
import { PerformanceRadar } from "@/components/PerformanceRadar";
import { getCriterionToCategory, getCriterionToDimensionCode } from "@/lib/evaluation-config";
import { loadEvaluationConfigForModality } from "@/lib/load-evaluation-config";

const MODALITIES_LIST = ["MUAY_THAI", "BOXING", "KICKBOXING"] as const;

export default async function DashboardPage() {
  const supabase = await createClient();
  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");
  const STATUS_LABEL: Record<string, string> = {
    PENDING: t("statusPending"),
    CONFIRMED: t("statusConfirmed"),
    ABSENT: t("statusAbsent"),
  };
  const CATEGORY_LABEL: Record<string, string> = {
    TECHNIQUE: t("categoryTechnique"),
    MINDSET: t("categoryMindset"),
    PERFORMANCE: t("categoryPerformance"),
  };

  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();

  if (!supabaseUser) return null;

  const dbUser = await syncUser(supabaseUser);
  const studentId = await getCurrentStudentId();

  const { today, endOfWeek } = getThisWeekRange();

  let allowedModalities: string[] = MODALITIES_LIST.slice();
  if (studentId) {
    const { data: student } = await supabase.from("Student").select("planId, primaryModality").eq("id", studentId).single();
    if (student?.planId) {
      const { data: plan } = await supabase.from("Plan").select("modality_scope").eq("id", student.planId).eq("is_active", true).single();
      if (plan?.modality_scope === "NONE") allowedModalities = [];
      else if (plan?.modality_scope === "SINGLE" && (student as { primaryModality?: string }).primaryModality)
        allowedModalities = [(student as { primaryModality: string }).primaryModality];
    }
  }

  const { data: lessonsData } = await supabase
    .from("Lesson")
    .select("id, modality, date, startTime, endTime")
    .gte("date", today)
    .lte("date", endOfWeek)
    .order("date", { ascending: true })
    .order("startTime", { ascending: true });

  const allLessons = lessonsData ?? [];
  const lessons =
    allowedModalities.length === 0 ? [] : allowedModalities.length < MODALITIES_LIST.length ? allLessons.filter((l) => allowedModalities.includes(l.modality)) : allLessons;
  const nextLesson = lessons[0] ?? null;
  const restOfWeek = lessons.slice(1);

  const lessonIds = lessons.map((l) => l.id);
  const attendanceByLesson: Record<string, string> = {};
  if (studentId && lessonIds.length > 0) {
    const { data: attendances } = await supabase
      .from("Attendance")
      .select("lessonId, status")
      .eq("studentId", studentId)
      .in("lessonId", lessonIds);
    (attendances ?? []).forEach((a) => {
      attendanceByLesson[a.lessonId] = a.status;
    });
  }

  const weekStart = getWeekStartMonday();
  const { data: weekThemes } = await supabase
    .from("WeekTheme")
    .select("modality, title, course_id")
    .eq("week_start", weekStart)
    .order("modality", { ascending: true });
  const temaSemanaList = weekThemes ?? [];

  const GENERAL_LAST_N = 10;
  let generalPerformanceScores: Record<string, number> | null = null;
  let attendanceByModality: Record<string, number> = {};
  let earnedBadges: { badgeCode: string; name: string; description: string; earnedAt: string }[] = [];
  let attendanceGoal = 10;
  let currentMonthCount = 0;
  let recommendedCourses: { id: string; name: string; category: string; modality: string | null }[] = [];
  let hasDigitalAccess = false;
  let notifications: { id: string; title: string; body: string | null; read_at: string | null; created_at: string }[] = [];
  let studentProfile: {
    weightKg: number | null;
    heightCm: number | null;
    dateOfBirth: string | null;
    medicalNotes: string | null;
    emergencyContact: string | null;
    updatedAt: string | null;
  } | null = null;
  if (studentId) {
    const { data: student } = await supabase.from("Student").select("planId").eq("id", studentId).single();
    if (student?.planId) {
      const { data: plan } = await supabase.from("Plan").select("name, price_monthly, includes_digital_access").eq("id", student.planId).eq("is_active", true).single();
      if (plan) {
        hasDigitalAccess = plan.includes_digital_access === true;
      }
    }
    attendanceByModality = await getAttendanceByModality(supabase, studentId);
    const { data: athlete } = await supabase.from("Athlete").select("id").eq("studentId", studentId).single();
    if (athlete) {
      const { data: evalsRows } = await supabase
        .from("AthleteEvaluation")
        .select("gas, technique, strength, theory, scores, modality")
        .eq("athleteId", athlete.id)
        .order("created_at", { ascending: false })
        .limit(GENERAL_LAST_N);
      const evaluations = (evalsRows ?? []).map((e) => ({
        gas: e.gas,
        technique: e.technique,
        strength: e.strength,
        theory: e.theory,
        scores: e.scores as Record<string, number> | null,
        modality: e.modality,
      }));

      const configByModality = new Map<string, { criterionToCategory: Map<string, string> }>();
      for (const mod of ["MUAY_THAI", "BOXING", "KICKBOXING"]) {
        const config = await loadEvaluationConfigForModality(supabase, mod);
        if (config) configByModality.set(mod, { criterionToCategory: getCriterionToCategory(config), criterionToDimensionCode: getCriterionToDimensionCode(config) });
      }

      if (evaluations.length > 0) {
        generalPerformanceScores = computeGeneralPerformanceScores(evaluations, configByModality, GENERAL_LAST_N, true);
      }
    }
    earnedBadges = await getEarnedBadges(supabase, studentId);
    const { data: profileRow } = await supabase
      .from("StudentProfile")
      .select("weightKg, heightCm, dateOfBirth, medicalNotes, emergencyContact, updatedAt")
      .eq("studentId", studentId)
      .maybeSingle();
    if (profileRow) {
      studentProfile = {
        weightKg: profileRow.weightKg != null ? Number(profileRow.weightKg) : null,
        heightCm: profileRow.heightCm != null ? Number(profileRow.heightCm) : null,
        dateOfBirth: profileRow.dateOfBirth ?? null,
        medicalNotes: profileRow.medicalNotes ?? null,
        emergencyContact: profileRow.emergencyContact ?? null,
        updatedAt: profileRow.updatedAt ?? null,
      };
    }
    const { data: goalRow } = await supabase.from("AttendanceGoal").select("target_value").eq("is_global", true).limit(1).single();
    if (goalRow) attendanceGoal = goalRow.target_value ?? 10;
    const monthStart = new Date().toISOString().slice(0, 7) + "-01";
    const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10);
    const { data: monthAtt } = await supabase.from("Attendance").select("lessonId").eq("studentId", studentId).eq("status", "CONFIRMED");
    if (monthAtt?.length) {
      const mLessonIds = [...new Set(monthAtt.map((a) => a.lessonId))];
      const { data: monthLessons } = await supabase.from("Lesson").select("id, date").in("id", mLessonIds).gte("date", monthStart).lte("date", monthEnd);
      currentMonthCount = monthLessons?.length ?? 0;
    }
    const { data: purchases } = await supabase.from("CoursePurchase").select("courseId").eq("studentId", studentId);
    const purchasedIds = new Set((purchases ?? []).map((p) => p.courseId));
    const { data: allCourses } = await supabase.from("Course").select("id, name, category, modality, included_in_digital_plan").eq("is_active", true).order("sort_order", { ascending: true }).order("name", { ascending: true });
    const accessible = (allCourses ?? []).filter(
      (c: { id: string; included_in_digital_plan?: boolean }) => (c.included_in_digital_plan && hasDigitalAccess) || purchasedIds.has(c.id)
    );
    const topModality = Object.entries(attendanceByModality).sort((a, b) => b[1] - a[1])[0]?.[0];
    recommendedCourses = [...accessible]
      .sort((a, b) => {
        if (!topModality) return 0;
        const aMatch = a.modality === topModality ? 1 : 0;
        const bMatch = b.modality === topModality ? 1 : 0;
        return bMatch - aMatch;
      })
      .slice(0, 3)
      .map((c) => ({ id: c.id, name: c.name, category: c.category, modality: c.modality }));
    const { data: notifRows } = await supabase
      .from("Notification")
      .select("id, title, body, read_at, created_at")
      .eq("studentId", studentId)
      .order("created_at", { ascending: false })
      .limit(10);
    notifications = (notifRows ?? []).map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body ?? null,
      read_at: n.read_at ?? null,
      created_at: n.created_at,
    }));
    const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id);
    if (unreadIds.length > 0) {
      const readAt = new Date().toISOString();
      await supabase.from("Notification").update({ read_at: readAt }).in("id", unreadIds);
      notifications = notifications.map((n) => (unreadIds.includes(n.id) ? { ...n, read_at: readAt } : n));
    }
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  let pastAttendances: { lessonId: string; modality: string; date: string; startTime: string; endTime: string; status: string; locationName?: string }[] = [];
  if (studentId) {
    const { data: pastAtt } = await supabase
      .from("Attendance")
      .select("lessonId, status")
      .eq("studentId", studentId)
      .order("createdAt", { ascending: false })
      .limit(50);
    if (pastAtt?.length) {
      const pastLessonIds = [...new Set((pastAtt ?? []).map((a) => a.lessonId))];
      const { data: pastLessons } = await supabase
        .from("Lesson")
        .select("id, modality, date, startTime, endTime, locationId")
        .in("id", pastLessonIds)
        .lt("date", todayStr)
        .order("date", { ascending: false })
        .limit(30);
      const lessonMap = new Map((pastLessons ?? []).map((l) => [l.id, l]));
      pastAttendances = (pastAtt ?? [])
        .filter((a) => lessonMap.has(a.lessonId))
        .map((a) => {
          const l = lessonMap.get(a.lessonId)!;
          const locId = (l as { locationId?: string }).locationId;
          return {
            lessonId: l.id,
            modality: l.modality,
            date: l.date,
            startTime: l.startTime,
            endTime: l.endTime,
            status: a.status,
            locationName: locId ? locationById.get(locId) : undefined,
          };
        })
        .slice(0, 20);
    }
  }

  const renderPresence = (lessonId: string) => (
    <VouNaoVouButtons
      lessonId={lessonId}
      currentStatus={attendanceByLesson[lessonId]}
      goingLabel={t("goingLabel")}
      notGoingLabel={t("notGoingLabel")}
      statusConfirmedLabel={STATUS_LABEL.CONFIRMED}
      statusAbsentLabel={STATUS_LABEL.ABSENT}
      statusPendingLabel={STATUS_LABEL.PENDING}
    />
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(20px, 5vw, 24px)" }}>
      <section>
        <h2 style={{ fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, marginBottom: "clamp(12px, 3vw, 16px)", color: "var(--text-primary)" }}>
          {t("agendaTitle")}
        </h2>
      {nextLesson ? (
        <div
          className="card"
          style={{
            backgroundColor: "var(--primary)",
            color: "#fff",
            padding: "clamp(20px, 5vw, 24px)",
          }}
        >
          <p style={{ fontSize: "clamp(14px, 3.5vw, 16px)", margin: "0 0 8px 0", opacity: 0.9 }}>
            {t("nextClass")}
          </p>
          <p style={{ fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, margin: "0 0 8px 0" }}>
            {MODALITY_LABELS[nextLesson.modality] ?? nextLesson.modality}
          </p>
          <p style={{ fontSize: "clamp(14px, 3.5vw, 16px)", margin: "0 0 12px 0", opacity: 0.9 }}>
            {(nextLesson as { locationId?: string }).locationId && locationById.get((nextLesson as { locationId: string }).locationId)
              ? `${locationById.get((nextLesson as { locationId: string }).locationId)} · `
              : ""}
            {formatLessonDate(nextLesson.date)} · {nextLesson.startTime}–{nextLesson.endTime}
          </p>
          <div style={{ marginTop: 12 }}>{renderPresence(nextLesson.id)}</div>
          <p style={{ marginTop: 12, marginBottom: 0, fontSize: "clamp(12px, 3vw, 14px)", opacity: 0.9 }}>
            {t("atGymScanQr")}{" "}
            <a href={`/check-in/${nextLesson.id}`} style={{ color: "#fff", textDecoration: "underline" }}>
              {t("openLinkOnPhone")}
            </a>
            .
          </p>
        </div>
      ) : (
        <div className="card">
          <p style={{ margin: 0, fontSize: "clamp(15px, 3.8vw, 17px)", color: "var(--text-secondary)" }}>
            {t("noClassesThisWeek")}
          </p>
        </div>
      )}

      {restOfWeek.length > 0 && (
        <>
          <h2 style={{ fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, marginBottom: "clamp(12px, 3vw, 16px)", color: "var(--text-primary)" }}>
            {t("thisWeek")}
          </h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(10px, 2.5vw, 12px)" }}>
            {restOfWeek.map((lesson) => (
              <li
                key={lesson.id}
                className="card"
                style={{ padding: "clamp(14px, 3.5vw, 16px)" }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)" }}>
                    {MODALITY_LABELS[lesson.modality] ?? lesson.modality}
                  </span>
                  <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                    {(lesson as { locationId?: string }).locationId && locationById.get((lesson as { locationId: string }).locationId)
                      ? `${locationById.get((lesson as { locationId: string }).locationId)} · `
                      : ""}
                    {formatLessonDate(lesson.date)} · {lesson.startTime}–{lesson.endTime}
                  </span>
                </div>
                <div style={{ marginTop: 8 }}>{renderPresence(lesson.id)}</div>
              </li>
            ))}
          </ul>
        </>
      )}
      </section>

      {temaSemanaList.length > 0 && (
        <section>
          <h2 style={{ fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, marginBottom: "clamp(12px, 3vw, 16px)", color: "var(--text-primary)" }}>
            {t("weekThemeTitle")}
          </h2>
          <p style={{ margin: "0 0 clamp(12px, 3vw, 16px) 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
            {t("weekThemeDescription")}
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(10px, 2.5vw, 12px)" }}>
            {temaSemanaList.map((item) => (
              <li key={item.modality}>
                <div
                  className="card"
                  style={{
                    padding: "clamp(14px, 3.5vw, 18px)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
                    {MODALITY_LABELS[item.modality] ?? item.modality}
                  </span>
                  <span style={{ fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
                    {item.title}
                  </span>
                  {item.course_id && (
                    <Link
                      href={`/dashboard/biblioteca/${item.course_id}`}
                      className="btn btn-primary"
                      style={{
                        marginTop: 4,
                        textDecoration: "none",
                        textAlign: "center",
                        minHeight: 44,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {t("viewTheoryVideo")} →
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {notifications.length > 0 && (
        <section>
          <h2 style={{ fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, marginBottom: "clamp(12px, 3vw, 16px)", color: "var(--text-primary)" }}>
            {t("notifications")}
          </h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(8px, 2vw, 10px)" }}>
            {notifications.map((n) => (
              <li
                key={n.id}
                className="card"
                style={{
                  padding: "clamp(14px, 3.5vw, 16px)",
                  borderLeft: n.read_at ? "3px solid transparent" : "3px solid var(--primary)",
                }}
              >
                <p style={{ margin: 0, fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)" }}>
                  {n.title}
                </p>
                {n.body && (
                  <p style={{ margin: "4px 0 0 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                    {n.body}
                  </p>
                )}
                <p style={{ margin: "6px 0 0 0", fontSize: "clamp(12px, 3vw, 14px)", color: "var(--text-secondary)", opacity: 0.9 }}>
                  {new Date(n.created_at).toLocaleDateString(locale === "en" ? "en-GB" : "pt-PT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {pastAttendances.length > 0 && (
        <section>
          <h2 style={{ fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, marginBottom: "clamp(12px, 3vw, 16px)", color: "var(--text-primary)" }}>
            {t("presenceHistory")}
          </h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(8px, 2vw, 10px)" }}>
            {pastAttendances.map((a) => (
              <li
                key={a.lessonId}
                className="card"
                style={{ padding: "clamp(12px, 3vw, 14px)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}
              >
                <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>
                  {MODALITY_LABELS[a.modality] ?? a.modality}
                </span>
                <span style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
                  {a.locationName ? `${a.locationName} · ` : ""}{formatLessonDate(a.date)} · {a.startTime}–{a.endTime}
                </span>
                <span
                  style={{
                    fontSize: "clamp(12px, 3vw, 14px)",
                    padding: "2px 8px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: a.status === "CONFIRMED" ? "var(--success)" : a.status === "ABSENT" ? "var(--danger)" : "var(--bg)",
                    color: a.status === "CONFIRMED" || a.status === "ABSENT" ? "#fff" : "var(--text-secondary)",
                  }}
                >
                  {STATUS_LABEL[a.status] ?? a.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 style={{ fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, marginBottom: "clamp(12px, 3vw, 16px)", color: "var(--text-primary)" }}>
          {t("myPerformance")}
        </h2>
        <div className="card" style={{ padding: "clamp(16px, 4vw, 20px)" }}>
          {generalPerformanceScores && Object.keys(generalPerformanceScores).length > 0 ? (
            <>
              <p style={{ margin: "0 0 12px 0", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)" }}>
                Performance geral
              </p>
              <p style={{ margin: "0 0 12px 0", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                Média das últimas {GENERAL_LAST_N} avaliações (escala 1–10).
              </p>
              <PerformanceRadar
                scores={generalPerformanceScores}
                axes={[...GENERAL_PERFORMANCE_AXES]}
                maxScore={10}
              />
              <Link
                href="/dashboard/performance"
                className="btn btn-secondary"
                style={{ marginTop: "var(--space-3)", textDecoration: "none", alignSelf: "flex-start" }}
              >
                Ver Performance
              </Link>
            </>
          ) : (
            <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
              {t("evaluationPlaceholder")}
            </p>
          )}
          {(studentProfile?.weightKg != null || studentProfile?.heightCm != null || studentProfile?.dateOfBirth || studentProfile?.medicalNotes || studentProfile?.emergencyContact) ? (
            <div style={{ marginTop: "clamp(16px, 4vw, 20px)", paddingTop: "clamp(16px, 4vw, 20px)", borderTop: "1px solid var(--border)" }}>
              <p style={{ margin: "0 0 12px 0", fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 600, color: "var(--text-primary)" }}>
                {t("myDataTitle")}
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {studentProfile.weightKg != null && (
                  <li style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                    {t("weightLabel")}: <strong style={{ color: "var(--text-primary)" }}>{studentProfile.weightKg} {t("weightUnit")}</strong>
                  </li>
                )}
                {studentProfile.heightCm != null && (
                  <li style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                    {t("heightLabel")}: <strong style={{ color: "var(--text-primary)" }}>{studentProfile.heightCm} {t("heightUnit")}</strong>
                  </li>
                )}
                {studentProfile.dateOfBirth && (
                  <li style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                    {t("dateOfBirthLabel")}: <strong style={{ color: "var(--text-primary)" }}>{new Date(studentProfile.dateOfBirth + "T12:00:00").toLocaleDateString(locale === "en" ? "en-GB" : "pt-PT", { day: "2-digit", month: "long", year: "numeric" })}</strong>
                  </li>
                )}
                {studentProfile.medicalNotes && (
                  <li style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                    {t("medicalNotesLabel")}: <span style={{ color: "var(--text-primary)" }}>{studentProfile.medicalNotes}</span>
                  </li>
                )}
                {studentProfile.emergencyContact && (
                  <li style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                    {t("emergencyContactLabel")}: <span style={{ color: "var(--text-primary)" }}>{studentProfile.emergencyContact}</span>
                  </li>
                )}
              </ul>
              <Link href="/dashboard/perfil" style={{ display: "inline-block", marginTop: 12, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--primary)", textDecoration: "none", fontWeight: 500 }}>
                {t("editMyData")} →
              </Link>
            </div>
          ) : (
            <div style={{ marginTop: "clamp(16px, 4vw, 20px)", paddingTop: "clamp(16px, 4vw, 20px)", borderTop: "1px solid var(--border)" }}>
              <p style={{ margin: "0 0 12px 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                {t("noProfileData")}{" "}
                <Link href="/dashboard/perfil" style={{ color: "var(--primary)", textDecoration: "underline" }}>
                  {t("editMyData")}
                </Link>
                .
              </p>
            </div>
          )}
          {Object.keys(attendanceByModality).length > 0 && (
            <div style={{ marginTop: "clamp(16px, 4vw, 20px)", paddingTop: "clamp(16px, 4vw, 20px)", borderTop: "1px solid var(--surface)" }}>
              <p style={{ margin: "0 0 8px 0", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
                {t("attendanceByModality")}
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                {Object.entries(attendanceByModality).map(([mod, count]) => (
                  <li key={mod} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "clamp(14px, 3.5vw, 16px)" }}>
                    <span style={{ color: "var(--text-primary)" }}>{MODALITY_LABELS[mod] ?? mod}</span>
                    <span style={{ color: "var(--primary)", fontWeight: 600 }}>{count} {t("classesCount")}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {studentId && (
        <>
          <section>
            <h2 style={{ fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, marginBottom: "clamp(12px, 3vw, 16px)", color: "var(--text-primary)" }}>
              {t("monthGoal")}
            </h2>
            <div className="card" style={{ padding: "clamp(16px, 4vw, 20px)" }}>
              <p style={{ margin: "0 0 8px 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                {t("confirmedThisMonth")}
              </p>
              <p style={{ margin: 0, fontSize: "clamp(24px, 6vw, 28px)", fontWeight: 700, color: "var(--primary)" }}>
                {currentMonthCount} / {attendanceGoal} {t("classesCount")}
              </p>
              {currentMonthCount >= attendanceGoal && (
                <p style={{ margin: "8px 0 0 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--success)" }}>
                  ✓ {t("goalReached")}
                </p>
              )}
            </div>
          </section>

          <section>
            <h2 style={{ fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, marginBottom: "clamp(12px, 3vw, 16px)", color: "var(--text-primary)" }}>
              {t("conquests")}
            </h2>
            {earnedBadges.length === 0 ? (
              <div className="card" style={{ padding: "clamp(16px, 4vw, 20px)" }}>
                <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                  {t("conquestsEmpty")}
                </p>
              </div>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(8px, 2vw, 10px)" }}>
                {earnedBadges.map((b) => (
                  <li key={b.badgeCode} className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)" }}>
                    <p style={{ margin: 0, fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)" }}>
                      🏆 {b.name}
                    </p>
                    {b.description && (
                      <p style={{ margin: "4px 0 0 0", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
                        {b.description}
                      </p>
                    )}
                    <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                      {new Date(b.earnedAt).toLocaleDateString(locale === "en" ? "en-GB" : "pt-PT", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {recommendedCourses.length > 0 && (
            <section>
              <h2 style={{ fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, marginBottom: "clamp(12px, 3vw, 16px)", color: "var(--text-primary)" }}>
                {t("recommendedForYou")}
              </h2>
              <p style={{ margin: "0 0 clamp(12px, 3vw, 16px) 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                {t("recommendedDescription")}
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(8px, 2vw, 10px)" }}>
                {recommendedCourses.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/dashboard/biblioteca/${c.id}`}
                      className="card"
                      style={{
                        display: "block",
                        padding: "clamp(14px, 3.5vw, 18px)",
                        textDecoration: "none",
                        color: "inherit",
                      }}
                    >
                      <span style={{ fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)" }}>
                        {c.name}
                      </span>
                      <p style={{ margin: "4px 0 0 0", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
                        {CATEGORY_LABEL[c.category] ?? c.category}
                        {c.modality ? ` · ${MODALITY_LABELS[c.modality] ?? c.modality}` : ""}
                      </p>
                      <span style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--primary)", marginTop: 4, display: "inline-block" }}>
                        {t("viewCourse")} →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

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
