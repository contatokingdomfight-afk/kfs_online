import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "@/lib/i18n";
import { formatLessonDate, MODALITY_LABELS } from "@/lib/lesson-utils";
import { type ModalityConfig, getAttendanceByModality, GENERAL_PERFORMANCE_AXES, computeGeneralPerformanceScores } from "@/lib/performance-utils";
import { getEarnedBadges, getNextBadgeProgress } from "@/lib/gamification";
import { getBMIGoalSuggestion, getBMICategoryLabel } from "@/lib/bmi";
import { PerformanceRadar } from "@/components/PerformanceRadarDynamic";
import { getCriterionToCategory, getCriterionToDimensionCode } from "@/lib/evaluation-config";
import { loadAllEvaluationConfigs } from "@/lib/load-evaluation-config";
import { getApplicableMissionTemplates } from "@/lib/missions";
import { getCachedLocations } from "@/lib/cached-reference-data";

const MODALITIES_LIST = ["MUAY_THAI", "BOXING", "KICKBOXING"] as const;
const GENERAL_LAST_N = 10;

type Props = { studentId: string | null; locale: "pt" | "en" };

export async function DashboardRestContent({ studentId, locale }: Props) {
  if (!studentId) return null;

  const supabase = await createClient();
  const t = getTranslations(locale);
  const todayStr = new Date().toISOString().slice(0, 10);
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

  const monthStart = new Date().toISOString().slice(0, 7) + "-01";
  const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10);
  const sixWeeksAgo = new Date();
  sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 42);
  const sixWeeksStr = sixWeeksAgo.toISOString().slice(0, 10);

  const [studentRes, locationsList, planRes, attByMod, athleteRes, badgesRes, nextBadgeRes, profileRes, goalRes, confirmedAttRes, purchasesRes, coursesRes, notifRes, allConfigs, pastAttRes] =
    await (async () => {
      const [studentRes, locationsList] = await Promise.all([
        supabase.from("Student").select("schoolId, planId, primaryModality").eq("id", studentId).single(),
        getCachedLocations(supabase),
      ]);
      const student = studentRes.data;
      const studentPlanId = student?.planId ?? null;
      const rest = await Promise.all([
        studentPlanId ? supabase.from("Plan").select("name, price_monthly, includes_digital_access").eq("id", studentPlanId).eq("is_active", true).single() : Promise.resolve({ data: null }),
    getAttendanceByModality(supabase, studentId),
    supabase.from("Athlete").select("id, currentBelt, currentXP").eq("studentId", studentId).single(),
    getEarnedBadges(supabase, studentId),
    getNextBadgeProgress(supabase, studentId),
    supabase.from("StudentProfile").select("weightKg, heightCm, dateOfBirth, medicalNotes, emergencyContact, updatedAt").eq("studentId", studentId).maybeSingle(),
    supabase.from("AttendanceGoal").select("target_value").eq("is_global", true).limit(1).single(),
    supabase.from("Attendance").select("lessonId").eq("studentId", studentId).eq("status", "CONFIRMED"),
    supabase.from("CoursePurchase").select("courseId").eq("studentId", studentId),
    supabase.from("Course").select("id, name, category, modality, included_in_digital_plan").eq("is_active", true).order("sort_order", { ascending: true }).order("name", { ascending: true }),
    supabase.from("Notification").select("id, title, body, read_at, created_at").eq("studentId", studentId).order("created_at", { ascending: false }).limit(10),
    loadAllEvaluationConfigs(supabase),
    supabase.from("Attendance").select("lessonId, status").eq("studentId", studentId).order("createdAt", { ascending: false }).limit(50),
      ]);
      const [planRes, attByMod, athleteRes, badgesRes, nextBadgeRes, profileRes, goalRes, confirmedAttRes, purchasesRes, coursesRes, notifRes, allConfigs, pastAttRes] = rest;
      return [studentRes, locationsList, planRes, attByMod, athleteRes, badgesRes, nextBadgeRes, profileRes, goalRes, confirmedAttRes, purchasesRes, coursesRes, notifRes, allConfigs, pastAttRes];
    })();

  const locationById = new Map(locationsList.map((loc) => [loc.id, loc.name]));
  const student = studentRes.data;
  const studentPrimaryModality = (student as { primaryModality?: string } | null)?.primaryModality ?? null;

  let hasDigitalAccess = false;
  const plan = planRes.data;
  if (plan) hasDigitalAccess = plan.includes_digital_access === true;
  const attendanceByModality = attByMod;
  const earnedBadges = badgesRes;
  const nextBadge = nextBadgeRes ?? null;
  let attendanceGoal = 10;
  if (goalRes.data) attendanceGoal = goalRes.data.target_value ?? 10;
  let studentProfile: {
    weightKg: number | null;
    heightCm: number | null;
    dateOfBirth: string | null;
    medicalNotes: string | null;
    emergencyContact: string | null;
    updatedAt: string | null;
  } | null = null;
  if (profileRes.data) {
    const p = profileRes.data;
    studentProfile = {
      weightKg: p.weightKg != null ? Number(p.weightKg) : null,
      heightCm: p.heightCm != null ? Number(p.heightCm) : null,
      dateOfBirth: p.dateOfBirth ?? null,
      medicalNotes: p.medicalNotes ?? null,
      emergencyContact: p.emergencyContact ?? null,
      updatedAt: p.updatedAt ?? null,
    };
  }

  const pastAttData = pastAttRes.data ?? [];
  const pastLessonIds = pastAttData.length > 0 ? [...new Set(pastAttData.map((a) => a.lessonId))] : [];
  const athlete = athleteRes.data;
  const [evalsRes, pastLessonsRes] = await Promise.all([
    athlete ? supabase.from("AthleteEvaluation").select("gas, technique, strength, theory, scores, modality").eq("athleteId", athlete.id).order("created_at", { ascending: false }).limit(GENERAL_LAST_N) : Promise.resolve({ data: [] }),
    pastLessonIds.length > 0 ? supabase.from("Lesson").select("id, modality, date, startTime, endTime, locationId").in("id", pastLessonIds).lt("date", todayStr).order("date", { ascending: false }).limit(30) : Promise.resolve({ data: [] }),
  ]);
  const evalsRows = evalsRes.data ?? [];
  const evaluations = evalsRows.map((e) => ({
    gas: e.gas,
    technique: e.technique,
    strength: e.strength,
    theory: e.theory,
    scores: e.scores as Record<string, number> | null,
    modality: e.modality,
  }));
  const configByModality = new Map<string, ModalityConfig>();
  for (const mod of ["MUAY_THAI", "BOXING", "KICKBOXING"]) {
    const config = allConfigs.get(mod);
    if (config) configByModality.set(mod, { criterionToCategory: getCriterionToCategory(config), criterionToDimensionCode: getCriterionToDimensionCode(config) });
  }
  let generalPerformanceScores: Record<string, number> | null = null;
  if (evaluations.length > 0) {
    generalPerformanceScores = computeGeneralPerformanceScores(evaluations, configByModality, GENERAL_LAST_N, true);
  }

  const confirmedAtt = confirmedAttRes.data ?? [];
  const purchasedIds = new Set((purchasesRes.data ?? []).map((p) => p.courseId));
  const allCoursesList = coursesRes.data ?? [];
  const accessible = allCoursesList.filter(
    (c: { id: string; included_in_digital_plan?: boolean }) => (c.included_in_digital_plan && hasDigitalAccess) || purchasedIds.has(c.id)
  );
  const topModality = Object.entries(attendanceByModality).sort((a, b) => b[1] - a[1])[0]?.[0];
  const recommendedCourses = [...accessible]
    .sort((a, b) => {
      if (!topModality) return 0;
      const aMatch = a.modality === topModality ? 1 : 0;
      const bMatch = b.modality === topModality ? 1 : 0;
      return bMatch - aMatch;
    })
    .slice(0, 3)
    .map((c) => ({ id: c.id, name: c.name, category: c.category, modality: c.modality }));

  let notifications = (notifRes.data ?? []).map((n) => ({
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

  let currentMonthCount = 0;
  let weeklyProgress: Array<{ weekStart: string; count: number }> = [];
  if (confirmedAtt.length > 0) {
    const allLessonIds = [...new Set(confirmedAtt.map((a) => a.lessonId))];
    const { data: confirmedLessons } = await supabase.from("Lesson").select("id, date").in("id", allLessonIds).gte("date", sixWeeksStr);
    const lessonsList = confirmedLessons ?? [];
    currentMonthCount = lessonsList.filter((l) => l.date >= monthStart && l.date <= monthEnd).length;
    const weekCounts = new Map<string, number>();
    lessonsList.forEach((lesson) => {
      const lessonDate = new Date(lesson.date + "T12:00:00");
      const dayOfWeek = lessonDate.getDay();
      const daysToMonday = (dayOfWeek + 6) % 7;
      const monday = new Date(lessonDate);
      monday.setDate(monday.getDate() - daysToMonday);
      const weekKey = monday.toISOString().slice(0, 10);
      weekCounts.set(weekKey, (weekCounts.get(weekKey) || 0) + 1);
    });
    for (let i = 5; i >= 0; i--) {
      const weekDate = new Date();
      weekDate.setDate(weekDate.getDate() - i * 7);
      const dayOfWeek = weekDate.getDay();
      const daysToMonday = (dayOfWeek + 6) % 7;
      weekDate.setDate(weekDate.getDate() - daysToMonday);
      const weekKey = weekDate.toISOString().slice(0, 10);
      weeklyProgress.push({ weekStart: weekKey, count: weekCounts.get(weekKey) || 0 });
    }
  }

  let pastAttendances: { lessonId: string; modality: string; date: string; startTime: string; endTime: string; status: string; locationName?: string }[] = [];
  if (pastAttData.length > 0 && pastLessonIds.length > 0) {
    const pastLessons = pastLessonsRes.data ?? [];
    const lessonMap = new Map(pastLessons.map((l) => [l.id, l]));
    pastAttendances = pastAttData
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

  let athleteStats: { currentBelt: string | null; currentXP: number; nextLevelXP: number; totalPresences: number } | null = null;
  let activeMissions: Array<{ id: string; name: string; description: string | null; xpReward: number }> = [];
  if (athlete) {
    const beltLevels = ["WHITE", "YELLOW", "ORANGE", "GREEN", "BLUE", "PURPLE", "BROWN", "BLACK", "BLACK_1", "BLACK_2", "BLACK_3", "GOLDEN"];
    const currentIndex = beltLevels.indexOf(athlete.currentBelt || "WHITE");
    const baseXP = 1000;
    const nextLevelXP = currentIndex >= 0 ? baseXP * Math.pow(2, currentIndex) : baseXP;
    const { count: totalPresences } = await supabase.from("Attendance").select("*", { count: "exact", head: true }).eq("studentId", studentId).eq("status", "CONFIRMED");
    athleteStats = {
      currentBelt: athlete.currentBelt,
      currentXP: athlete.currentXP || 0,
      nextLevelXP,
      totalPresences: totalPresences || 0,
    };
    const missions = await getApplicableMissionTemplates(supabase, athlete.id, athlete.currentXP || 0, studentPrimaryModality);
    activeMissions = missions.slice(0, 3).map((m) => ({ id: m.id, name: m.name, description: m.description, xpReward: m.xpReward }));
  }

  return (
    <>
      {athleteStats && (
        <section>
          <h2 style={{ fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, marginBottom: "clamp(12px, 3vw, 16px)", color: "var(--text-primary)" }}>
            {t("myStats")}
          </h2>
          <div className="card" style={{ padding: "clamp(16px, 4vw, 20px)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "clamp(16px, 4vw, 20px)" }}>
              <div>
                <p style={{ margin: "0 0 4px 0", fontSize: "clamp(12px, 3vw, 14px)", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{t("currentBelt")}</p>
                <p style={{ margin: 0, fontSize: "clamp(18px, 4.5vw, 22px)", fontWeight: 700, color: "var(--primary)" }}>{athleteStats.currentBelt ? t(("belt_" + athleteStats.currentBelt) as "belt_WHITE") : "—"}</p>
              </div>
              <div>
                <p style={{ margin: "0 0 4px 0", fontSize: "clamp(12px, 3vw, 14px)", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>XP</p>
                <p style={{ margin: 0, fontSize: "clamp(18px, 4.5vw, 22px)", fontWeight: 700, color: "var(--primary)" }}>{athleteStats.currentXP.toLocaleString()}</p>
                <p style={{ margin: "2px 0 0 0", fontSize: "clamp(11px, 2.8vw, 13px)", color: "var(--text-secondary)" }}>/ {athleteStats.nextLevelXP.toLocaleString()} {t("forNextLevel")}</p>
              </div>
              <div>
                <p style={{ margin: "0 0 4px 0", fontSize: "clamp(12px, 3vw, 14px)", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{t("totalPresences")}</p>
                <p style={{ margin: 0, fontSize: "clamp(18px, 4.5vw, 22px)", fontWeight: 700, color: "var(--success)" }}>{athleteStats.totalPresences}</p>
              </div>
              <div>
                <p style={{ margin: "0 0 4px 0", fontSize: "clamp(12px, 3vw, 14px)", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{t("thisMonth")}</p>
                <p style={{ margin: 0, fontSize: "clamp(18px, 4.5vw, 22px)", fontWeight: 700, color: currentMonthCount >= attendanceGoal ? "var(--success)" : "var(--primary)" }}>{currentMonthCount} / {attendanceGoal}</p>
                <div style={{ marginTop: 6, height: 4, borderRadius: 2, backgroundColor: "var(--border)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, (currentMonthCount / attendanceGoal) * 100)}%`, backgroundColor: currentMonthCount >= attendanceGoal ? "var(--success)" : "var(--primary)", transition: "width 0.3s ease" }} />
                </div>
                {currentMonthCount >= attendanceGoal && <p style={{ margin: "4px 0 0 0", fontSize: "clamp(11px, 2.8vw, 13px)", color: "var(--success)" }}>✓ {t("goalReached")}</p>}
              </div>
            </div>
            <div style={{ marginTop: "clamp(16px, 4vw, 20px)", paddingTop: "clamp(16px, 4vw, 20px)", borderTop: "1px solid var(--border)" }}>
              <p style={{ margin: "0 0 8px 0", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>{t("progressToNextBelt")}</p>
              <div style={{ width: "100%", height: 12, backgroundColor: "var(--surface)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
                <div style={{ width: `${Math.min((athleteStats.currentXP / athleteStats.nextLevelXP) * 100, 100)}%`, height: "100%", backgroundColor: "var(--primary)", transition: "width 0.3s ease" }} />
              </div>
              <p style={{ margin: "4px 0 0 0", fontSize: "clamp(11px, 2.8vw, 13px)", color: "var(--text-secondary)", textAlign: "right" }}>{Math.round((athleteStats.currentXP / athleteStats.nextLevelXP) * 100)}%</p>
            </div>
            <Link href="/dashboard/atleta" className="btn btn-secondary" style={{ marginTop: "clamp(12px, 3vw, 16px)", textDecoration: "none", textAlign: "center" }}>{t("viewAthleteProfile")} →</Link>
          </div>
        </section>
      )}
      {activeMissions.length > 0 && (
        <section>
          <h2 style={{ fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, marginBottom: "clamp(12px, 3vw, 16px)", color: "var(--text-primary)" }}>🎯 {t("featuredMissions")}</h2>
          <p style={{ margin: "0 0 clamp(12px, 3vw, 16px) 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>{t("featuredMissionsDescription")}</p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(10px, 2.5vw, 12px)" }}>
            {activeMissions.map((mission) => (
              <li key={mission.id}>
                <div className="card" style={{ padding: "clamp(16px, 4vw, 20px)", borderLeft: "4px solid var(--primary)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
                    <p style={{ margin: 0, fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>{mission.name}</p>
                    <span style={{ fontSize: "clamp(13px, 3.2vw, 15px)", fontWeight: 600, color: "var(--primary)", backgroundColor: "var(--primary-light)", padding: "4px 12px", borderRadius: "var(--radius-full)", whiteSpace: "nowrap" }}>+{mission.xpReward} XP</span>
                  </div>
                  {mission.description && <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>{mission.description}</p>}
                </div>
              </li>
            ))}
          </ul>
          <Link href="/dashboard/atleta" style={{ display: "inline-block", marginTop: "clamp(12px, 3vw, 16px)", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--primary)", textDecoration: "none", fontWeight: 500 }}>{t("viewAllMissions")} →</Link>
        </section>
      )}
      {notifications.length > 0 && (
        <section>
          <h2 style={{ fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, marginBottom: "clamp(12px, 3vw, 16px)", color: "var(--text-primary)" }}>{t("notifications")}</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(8px, 2vw, 10px)" }}>
            {notifications.map((n) => (
              <li key={n.id} className="card" style={{ padding: "clamp(14px, 3.5vw, 16px)", borderLeft: n.read_at ? "3px solid transparent" : "3px solid var(--primary)" }}>
                <p style={{ margin: 0, fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)" }}>{n.title}</p>
                {n.body && <p style={{ margin: "4px 0 0 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>{n.body}</p>}
                <p style={{ margin: "6px 0 0 0", fontSize: "clamp(12px, 3vw, 14px)", color: "var(--text-secondary)", opacity: 0.9 }}>{new Date(n.created_at).toLocaleDateString(locale === "en" ? "en-GB" : "pt-PT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {pastAttendances.length > 0 && (
        <section>
          <h2 style={{ fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, marginBottom: "clamp(12px, 3vw, 16px)", color: "var(--text-primary)" }}>{t("presenceHistory")}</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(8px, 2vw, 10px)" }}>
            {pastAttendances.map((a) => (
              <li key={a.lessonId} className="card" style={{ padding: "clamp(12px, 3vw, 14px)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 500, color: "var(--text-primary)" }}>{MODALITY_LABELS[a.modality] ?? a.modality}</span>
                <span style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>{a.locationName ? `${a.locationName} · ` : ""}{formatLessonDate(a.date)} · {a.startTime}–{a.endTime}</span>
                <span style={{ fontSize: "clamp(12px, 3vw, 14px)", padding: "2px 8px", borderRadius: "var(--radius-md)", backgroundColor: a.status === "CONFIRMED" ? "var(--success)" : a.status === "ABSENT" ? "var(--danger)" : "var(--bg)", color: a.status === "CONFIRMED" || a.status === "ABSENT" ? "#fff" : "var(--text-secondary)" }}>{STATUS_LABEL[a.status] ?? a.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {weeklyProgress.length > 0 && (
        <section>
          <h2 style={{ fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, marginBottom: "clamp(12px, 3vw, 16px)", color: "var(--text-primary)" }}>📈 {t("weeklyProgress")}</h2>
          <div className="card" style={{ padding: "clamp(16px, 4vw, 20px)" }}>
            <p style={{ margin: "0 0 clamp(16px, 4vw, 20px) 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>{t("weeklyProgressDescription")}</p>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "clamp(8px, 2vw, 12px)", height: 200, padding: "0 0 clamp(8px, 2vw, 12px) 0" }}>
              {weeklyProgress.map((week, index) => {
                const maxCount = Math.max(...weeklyProgress.map((w) => w.count), 1);
                const heightPercent = (week.count / maxCount) * 100;
                const weekDate = new Date(week.weekStart + "T12:00:00");
                const weekLabel = weekDate.toLocaleDateString(locale === "en" ? "en-GB" : "pt-PT", { day: "2-digit", month: "short" });
                return (
                  <div key={index} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <div style={{ width: "100%", height: `${heightPercent}%`, backgroundColor: week.count > 0 ? "var(--primary)" : "var(--surface)", borderRadius: "var(--radius-md) var(--radius-md) 0 0", minHeight: week.count > 0 ? 20 : 8, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 8, transition: "all 0.3s ease" }}>
                      {week.count > 0 && <span style={{ fontSize: "clamp(12px, 3vw, 14px)", fontWeight: 600, color: "#fff" }}>{week.count}</span>}
                    </div>
                    <span style={{ fontSize: "clamp(10px, 2.5vw, 12px)", color: "var(--text-secondary)", textAlign: "center" }}>{weekLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
      {/* A minha performance – só radar ou placeholder + link para Perfil do Atleta */}
      <section>
        <h2 style={{ fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, marginBottom: "clamp(12px, 3vw, 16px)", color: "var(--text-primary)" }}>{t("myPerformance")}</h2>
        <div className="card" style={{ padding: "clamp(16px, 4vw, 20px)" }}>
          {generalPerformanceScores && Object.keys(generalPerformanceScores).length > 0 ? (
            <>
              <p style={{ margin: "0 0 12px 0", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)" }}>Performance geral</p>
              <p style={{ margin: "0 0 12px 0", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>Média das últimas {GENERAL_LAST_N} avaliações (escala 1–10).</p>
              <PerformanceRadar scores={generalPerformanceScores} axes={[...GENERAL_PERFORMANCE_AXES]} maxScore={10} />
              <Link href="/dashboard/performance" className="btn btn-secondary" style={{ marginTop: "var(--space-3)", textDecoration: "none", alignSelf: "flex-start" }}>{t("viewAthleteProfileLink")}</Link>
            </>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>{t("evaluationPlaceholder")}</p>
              <Link href="/dashboard/performance" style={{ display: "inline-block", marginTop: 12, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--primary)", textDecoration: "none", fontWeight: 500 }}>{t("viewAthleteProfileLink")} →</Link>
            </>
          )}
        </div>
      </section>

      {/* Os meus dados – perfil + presenças por modalidade */}
      {(studentProfile && (studentProfile.weightKg != null || studentProfile.heightCm != null || studentProfile.dateOfBirth || studentProfile.medicalNotes || studentProfile.emergencyContact)) || Object.keys(attendanceByModality).length > 0 ? (
        <section>
          <h2 style={{ fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, marginBottom: "clamp(12px, 3vw, 16px)", color: "var(--text-primary)" }}>{t("myDataTitle")}</h2>
          <div className="card" style={{ padding: "clamp(16px, 4vw, 20px)" }}>
            {studentProfile && (studentProfile.weightKg != null || studentProfile.heightCm != null || studentProfile.dateOfBirth || studentProfile.medicalNotes || studentProfile.emergencyContact) && (
              <>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                  {studentProfile.weightKg != null && <li style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>{t("weightLabel")}: <strong style={{ color: "var(--text-primary)" }}>{studentProfile.weightKg} {t("weightUnit")}</strong></li>}
                  {studentProfile.heightCm != null && <li style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>{t("heightLabel")}: <strong style={{ color: "var(--text-primary)" }}>{studentProfile.heightCm} {t("heightUnit")}</strong></li>}
                  {studentProfile.dateOfBirth && <li style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>{t("dateOfBirthLabel")}: <strong style={{ color: "var(--text-primary)" }}>{new Date(studentProfile.dateOfBirth + "T12:00:00").toLocaleDateString(locale === "en" ? "en-GB" : "pt-PT", { day: "2-digit", month: "long", year: "numeric" })}</strong></li>}
                  {studentProfile.medicalNotes && <li style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>{t("medicalNotesLabel")}: <span style={{ color: "var(--text-primary)" }}>{studentProfile.medicalNotes}</span></li>}
                  {studentProfile.emergencyContact && <li style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>{t("emergencyContactLabel")}: <span style={{ color: "var(--text-primary)" }}>{studentProfile.emergencyContact}</span></li>}
                </ul>
                <Link href="/dashboard/perfil" style={{ display: "inline-block", marginTop: 12, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--primary)", textDecoration: "none", fontWeight: 500 }}>{t("editMyData")} →</Link>
              </>
            )}
            {Object.keys(attendanceByModality).length > 0 && (
              <div style={{ marginTop: studentProfile && (studentProfile.weightKg != null || studentProfile.heightCm != null || studentProfile.dateOfBirth || studentProfile.medicalNotes || studentProfile.emergencyContact) ? "clamp(16px, 4vw, 20px)" : 0, paddingTop: studentProfile && (studentProfile.weightKg != null || studentProfile.heightCm != null || studentProfile.dateOfBirth || studentProfile.medicalNotes || studentProfile.emergencyContact) ? "clamp(16px, 4vw, 20px)" : 0, borderTop: studentProfile && (studentProfile.weightKg != null || studentProfile.heightCm != null || studentProfile.dateOfBirth || studentProfile.medicalNotes || studentProfile.emergencyContact) ? "1px solid var(--border)" : "none" }}>
                <p style={{ margin: "0 0 8px 0", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>{t("attendanceByModality")}</p>
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
      ) : null}
      {studentId && (
        <>
          <section>
            <h2 style={{ fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, marginBottom: "clamp(12px, 3vw, 16px)", color: "var(--text-primary)" }}>{t("monthGoal")}</h2>
            <div className="card" style={{ padding: "clamp(16px, 4vw, 20px)", borderLeft: currentMonthCount >= attendanceGoal ? "4px solid var(--success)" : undefined }}>
              {currentMonthCount >= attendanceGoal && <p style={{ margin: "0 0 8px 0", fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--success)" }}>🎉 {locale === "pt" ? "Parabéns!" : "Congratulations!"}</p>}
              <p style={{ margin: "0 0 8px 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>{t("confirmedThisMonth")}</p>
              <p style={{ margin: 0, fontSize: "clamp(24px, 6vw, 28px)", fontWeight: 700, color: currentMonthCount >= attendanceGoal ? "var(--success)" : "var(--primary)" }}>{currentMonthCount} / {attendanceGoal} {t("classesCount")}</p>
              <div style={{ marginTop: 10, height: 8, borderRadius: 4, backgroundColor: "var(--border)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(100, (currentMonthCount / attendanceGoal) * 100)}%`, backgroundColor: currentMonthCount >= attendanceGoal ? "var(--success)" : "var(--primary)", transition: "width 0.3s ease" }} />
              </div>
              {currentMonthCount >= attendanceGoal && <p style={{ margin: "8px 0 0 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--success)" }}>✓ {t("goalReached")}</p>}
            </div>
          </section>
          {studentProfile?.weightKg != null && studentProfile?.heightCm != null && (() => {
            const suggestion = getBMIGoalSuggestion(Number(studentProfile.weightKg), Number(studentProfile.heightCm));
            if (!suggestion) return null;
            const categoryLabel = getBMICategoryLabel(suggestion.category, locale);
            const goalText = t(suggestion.messageKey);
            return (
              <section key="health-goal">
                <h2 style={{ fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, marginBottom: "clamp(12px, 3vw, 16px)", color: "var(--text-primary)" }}>{t("healthGoal")}</h2>
                <div className="card" style={{ padding: "clamp(16px, 4vw, 20px)" }}>
                  <p style={{ margin: "0 0 8px 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>{t("healthGoalIntro")}</p>
                  <p style={{ margin: 0, fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 700, color: "var(--text-primary)" }}>IMC {suggestion.currentBMI} · {categoryLabel}</p>
                  <p style={{ margin: "8px 0 0 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--primary)", fontWeight: 500 }}>{goalText}</p>
                </div>
              </section>
            );
          })()}
          {generalPerformanceScores && Object.keys(generalPerformanceScores).length > 0 && (() => {
            const maxScore = 10;
            const axes = GENERAL_PERFORMANCE_AXES.map((a) => ({ id: a.id, label: a.label, score: generalPerformanceScores![a.id] ?? 0 }));
            const toImprove = axes.filter((e) => e.score < maxScore).sort((a, b) => a.score - b.score).slice(0, 2);
            if (toImprove.length === 0) return null;
            return (
              <section key="evaluation-goals">
                <h2 style={{ fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, marginBottom: "clamp(12px, 3vw, 16px)", color: "var(--text-primary)" }}>{t("evaluationGoals")}</h2>
                <p style={{ margin: "0 0 clamp(12px, 3vw, 16px) 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>{t("evaluationGoalsIntro")}</p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(8px, 2vw, 10px)" }}>
                  {toImprove.map((e) => {
                    const nextVal = Math.min(maxScore, Math.ceil(e.score) + 1);
                    const msg = t("improveAxisTo").replace("{axis}", e.label).replace("{value}", String(nextVal));
                    return (
                      <li key={e.id} className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)" }}>
                        <p style={{ margin: 0, fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)" }}>🎯 {msg}</p>
                        <p style={{ margin: "4px 0 0 0", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>{e.label}: {e.score.toFixed(1)} / {maxScore}</p>
                        <div style={{ marginTop: 8, height: 6, borderRadius: 3, backgroundColor: "var(--border)", overflow: "hidden" }}><div style={{ height: "100%", width: `${Math.min(100, (e.score / maxScore) * 100)}%`, backgroundColor: "var(--primary)" }} /></div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })()}
          {nextBadge && (
            <section>
              <h2 style={{ fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, marginBottom: "clamp(12px, 3vw, 16px)", color: "var(--text-primary)" }}>{t("nextConquest")}</h2>
              <div className="card" style={{ padding: "clamp(16px, 4vw, 20px)" }}>
                <p style={{ margin: 0, fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)" }}>🎯 {nextBadge.name}</p>
                {nextBadge.description && <p style={{ margin: "4px 0 8px 0", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>{nextBadge.description}</p>}
                <p style={{ margin: 0, fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>{nextBadge.current} / {nextBadge.target}</p>
                <div style={{ marginTop: 8, height: 6, borderRadius: 3, backgroundColor: "var(--border)", overflow: "hidden" }}><div style={{ height: "100%", width: `${nextBadge.progressPct}%`, backgroundColor: "var(--primary)", transition: "width 0.3s ease" }} /></div>
              </div>
            </section>
          )}
          <section>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "clamp(8px, 2vw, 12px)", marginBottom: "clamp(12px, 3vw, 16px)" }}>
              <h2 style={{ fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, margin: 0, color: "var(--text-primary)" }}>{t("conquests")}</h2>
              <Link href="/dashboard/conquistas" style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--primary)", fontWeight: 500, textDecoration: "none" }}>{t("viewAllConquests")} →</Link>
            </div>
            {earnedBadges.length === 0 ? (
              <div className="card" style={{ padding: "clamp(16px, 4vw, 20px)" }}><p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>{t("conquestsEmpty")}</p></div>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(8px, 2vw, 10px)" }}>
                {earnedBadges.map((b) => (
                  <li key={b.badgeCode} className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)" }}>
                    <p style={{ margin: 0, fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)" }}>🏆 {b.name}</p>
                    {b.description && <p style={{ margin: "4px 0 0 0", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>{b.description}</p>}
                    <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "var(--text-secondary)" }}>{new Date(b.earnedAt).toLocaleDateString(locale === "en" ? "en-GB" : "pt-PT", { day: "2-digit", month: "short", year: "numeric" })}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {recommendedCourses.length > 0 && (
            <section>
              <h2 style={{ fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, marginBottom: "clamp(12px, 3vw, 16px)", color: "var(--text-primary)" }}>{t("recommendedForYou")}</h2>
              <p style={{ margin: "0 0 clamp(12px, 3vw, 16px) 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>{t("recommendedDescription")}</p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(8px, 2vw, 10px)" }}>
                {recommendedCourses.map((c) => (
                  <li key={c.id}>
                    <Link href={`/dashboard/biblioteca/${c.id}`} className="card" style={{ display: "block", padding: "clamp(14px, 3.5vw, 18px)", textDecoration: "none", color: "inherit" }}>
                      <span style={{ fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)" }}>{c.name}</span>
                      <p style={{ margin: "4px 0 0 0", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>{CATEGORY_LABEL[c.category] ?? c.category}{c.modality ? ` · ${MODALITY_LABELS[c.modality] ?? c.modality}` : ""}</p>
                      <span style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--primary)", marginTop: 4, display: "inline-block" }}>{t("viewCourse")} →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </>
  );
}
