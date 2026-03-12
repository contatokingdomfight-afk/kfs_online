import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { getCachedLocations } from "@/lib/cached-reference-data";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import { getPlanAccess } from "@/lib/plan-access";
import { requirePlan } from "@/lib/require-plan";
import { redirect } from "next/navigation";

const SIX_WEEKS_AGO = (() => {
  const d = new Date();
  d.setDate(d.getDate() - 42);
  return d.toISOString().slice(0, 10);
})();

const PAGE_SIZE = 30;

function getWeekKey(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dayOfWeek = date.getDay();
  const daysToMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(date);
  monday.setDate(monday.getDate() - daysToMonday);
  return monday.toISOString().slice(0, 10);
}

export default async function DashboardHistoricoPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requirePlan();
  const supabase = await createClient();
  const studentId = await getCurrentStudentId();
  const planAccess = await getPlanAccess(supabase, studentId);

  if (!planAccess.hasCheckIn) {
    redirect("/dashboard?message=plan-no-checkin");
  }

  const [locale, params] = await Promise.all([getLocaleFromCookies(), searchParams]);
  const t = getTranslations(locale as "pt" | "en");
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const todayStr = new Date().toISOString().slice(0, 10);
  const STATUS_LABEL: Record<string, string> = {
    PENDING: t("statusPending"),
    CONFIRMED: t("statusConfirmed"),
    ABSENT: t("statusAbsent"),
  };

  const locationsList = await getCachedLocations(supabase);
  const locationById = new Map(locationsList.map((loc) => [loc.id, loc.name]));

  let studentSchoolId: string | null = null;
  if (studentId) {
    const { data: student } = await supabase.from("Student").select("schoolId").eq("id", studentId).single();
    studentSchoolId = student?.schoolId ?? null;
  }

  if (!studentId) {
    return (
      <div style={{ padding: "clamp(20px, 5vw, 32px)" }}>
        <p style={{ color: "var(--text-secondary)" }}>{t("dashboardHistoricoLoginRequired")}</p>
        <Link href="/dashboard" className="btn btn-primary" style={{ marginTop: 16, textDecoration: "none" }}>
          ← {t("navHome")}
        </Link>
      </div>
    );
  }

  const { data: allAttData } = await supabase
    .from("Attendance")
    .select("lessonId, status")
    .eq("studentId", studentId)
    .range(0, 999);

  const attByLesson = new Map((allAttData ?? []).map((a) => [a.lessonId, a.status]));
  const pastLessonIds = [...new Set((allAttData ?? []).map((a) => a.lessonId))];

  let allPastLessons: { id: string; modality: string; date: string; startTime: string; endTime: string; locationId?: string }[] = [];
  if (pastLessonIds.length > 0) {
    let lessonsQuery = supabase
      .from("Lesson")
      .select("id, modality, date, startTime, endTime, locationId")
      .in("id", pastLessonIds)
      .lt("date", todayStr);
    if (studentSchoolId) lessonsQuery = lessonsQuery.eq("schoolId", studentSchoolId);
    const { data } = await lessonsQuery.order("date", { ascending: false }).order("startTime", { ascending: false });
    allPastLessons = data ?? [];
  }

  const sortedLessons = (allPastLessons ?? []).sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));
  const paginatedLessons = sortedLessons.slice(offset, offset + PAGE_SIZE);

  const { data: confirmedAtt } = await supabase
    .from("Attendance")
    .select("lessonId")
    .eq("studentId", studentId)
    .eq("status", "CONFIRMED");

  const confirmedLessonIds = [...new Set((confirmedAtt ?? []).map((a) => a.lessonId))];
  const { data: confirmedLessons } =
    confirmedLessonIds.length > 0
      ? await supabase.from("Lesson").select("id, date").in("id", confirmedLessonIds).gte("date", SIX_WEEKS_AGO)
      : { data: [] };

  const weekCounts = new Map<string, number>();
  (confirmedLessons ?? []).forEach((lesson) => {
    const weekKey = getWeekKey(lesson.date);
    weekCounts.set(weekKey, (weekCounts.get(weekKey) || 0) + 1);
  });

  const weeklyProgress: Array<{ weekStart: string; count: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const weekDate = new Date();
    weekDate.setDate(weekDate.getDate() - i * 7);
    const dayOfWeek = weekDate.getDay();
    const daysToMonday = (dayOfWeek + 6) % 7;
    weekDate.setDate(weekDate.getDate() - daysToMonday);
    const weekKey = weekDate.toISOString().slice(0, 10);
    weeklyProgress.push({ weekStart: weekKey, count: weekCounts.get(weekKey) || 0 });
  }

  const pastAttendances = paginatedLessons.map((l) => {
    const locId = (l as { locationId?: string }).locationId;
    const status = attByLesson.get(l.id) ?? "PENDING";
    return {
      lessonId: l.id,
      modality: l.modality,
      date: l.date,
      startTime: l.startTime,
      endTime: l.endTime,
      status,
      locationName: locId ? locationById.get(locId) : undefined,
    };
  });

  const maxCount = Math.max(...weeklyProgress.map((w) => w.count), 1);
  const hasMore = offset + PAGE_SIZE < sortedLessons.length;

  function formatLessonDate(dateStr: string): string {
    try {
      const [y, m, d] = dateStr.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString(locale === "en" ? "en-GB" : "pt-PT", {
        weekday: "short",
        day: "2-digit",
        month: "short",
      });
    } catch {
      return dateStr;
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(24px, 6vw, 32px)" }}>
      <div>
        <Link href="/dashboard" style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--primary)", textDecoration: "none", marginBottom: 8, display: "inline-block" }}>
          ← {t("navHome")}
        </Link>
        <h1 style={{ fontSize: "clamp(22px, 5.5vw, 28px)", fontWeight: 700, margin: "0 0 8px 0", color: "var(--text-primary)" }}>
          {t("dashboardHistoricoTitle")}
        </h1>
        <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
          {t("dashboardHistoricoDescription")}
        </p>
      </div>

      <section className="card" style={{ padding: "clamp(20px, 5vw, 28px)" }}>
        <h2 style={{ fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, marginBottom: "clamp(16px, 4vw, 20px)", color: "var(--text-primary)" }}>
          📈 {t("dashboardHistoricoWeeklyChart")}
        </h2>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "clamp(8px, 2vw, 12px)", height: 180, padding: "0 0 clamp(8px, 2vw, 12px) 0" }}>
          {weeklyProgress.map((week, index) => {
            const heightPercent = (week.count / maxCount) * 100;
            const weekDate = new Date(week.weekStart + "T12:00:00");
            const weekLabel = weekDate.toLocaleDateString(locale === "en" ? "en-GB" : "pt-PT", { day: "2-digit", month: "short" });
            return (
              <div key={index} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: "100%",
                    height: `${heightPercent}%`,
                    backgroundColor: week.count > 0 ? "var(--primary)" : "var(--surface)",
                    borderRadius: "var(--radius-md) var(--radius-md) 0 0",
                    minHeight: week.count > 0 ? 24 : 8,
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "center",
                    paddingTop: 8,
                    transition: "all 0.3s ease",
                  }}
                >
                  {week.count > 0 && (
                    <span style={{ fontSize: "clamp(12px, 3vw, 14px)", fontWeight: 600, color: week.count > 0 ? "#fff" : "var(--text-secondary)" }}>
                      {week.count}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: "clamp(10px, 2.5vw, 12px)", color: "var(--text-secondary)", textAlign: "center" }}>
                  {weekLabel}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, marginBottom: "clamp(12px, 3vw, 16px)", color: "var(--text-primary)" }}>
          {t("presenceHistory")}
        </h2>
        {pastAttendances.length === 0 ? (
          <div className="card" style={{ padding: "clamp(20px, 5vw, 28px)" }}>
            <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
              {t("dashboardHistoricoEmpty")}
            </p>
          </div>
        ) : (
          <>
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
                    {a.locationName ? `${a.locationName} · ` : ""}
                    {formatLessonDate(a.date)} · {a.startTime}–{a.endTime}
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
            {(hasMore || page > 1) && (
              <div style={{ display: "flex", gap: 12, marginTop: 20, justifyContent: "center", flexWrap: "wrap" }}>
                {page > 1 && (
                  <Link
                    href={`/dashboard/historico?page=${page - 1}`}
                    className="btn"
                    style={{ textDecoration: "none", background: "var(--surface)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
                  >
                    ← {t("back")}
                  </Link>
                )}
                {hasMore && (
                  <Link
                    href={`/dashboard/historico?page=${page + 1}`}
                    className="btn btn-primary"
                    style={{ textDecoration: "none" }}
                  >
                    {t("dashboardHistoricoLoadMore")} →
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
