import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { getThisWeekRange, formatLessonDate, MODALITY_LABELS, getWeekStartMonday } from "@/lib/lesson-utils";
import { VouNaoVouButtons } from "./VouNaoVouButtons";
import { getCachedLocations } from "@/lib/cached-reference-data";
import { Suspense } from "react";
import { DashboardRestSkeleton } from "./DashboardRestSkeleton";
import { DashboardRestContent } from "./DashboardRestContent";
import { getPlanAccess } from "@/lib/plan-access";

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
  const CATEGORY_LABEL: Record<string, string> = {
    TECHNIQUE: t("categoryTechnique"),
    MINDSET: t("categoryMindset"),
    PERFORMANCE: t("categoryPerformance"),
  };

  if (!dbUser) return null;

  const studentId = await getCurrentStudentId();
  const planAccess = await getPlanAccess(supabase, studentId);
  const { hasDigitalAccess, hasCheckIn, allowedModalities } = planAccess;

  const { today, endOfWeek } = getThisWeekRange();
  const weekStart = getWeekStartMonday();
  const todayStr = new Date().toISOString().slice(0, 10);

  let studentSchoolId: string | null = null;
  if (studentId) {
    const { data: student } = await supabase.from("Student").select("schoolId").eq("id", studentId).single();
    studentSchoolId = student?.schoolId ?? null;
  }

  // Paralelizar: aulas, locations, weekThemes
  let lessonsQuery = supabase
    .from("Lesson")
    .select("id, modality, date, startTime, endTime, locationId")
    .gte("date", today)
    .lte("date", endOfWeek);
  if (studentSchoolId) lessonsQuery = lessonsQuery.eq("schoolId", studentSchoolId);

  const [lessonsRes, locationsList, weekThemesRes] = await Promise.all([
    lessonsQuery.order("date", { ascending: true }).order("startTime", { ascending: true }),
    getCachedLocations(supabase),
    supabase.from("WeekTheme").select("modality, title, course_id, video_url").eq("week_start", weekStart).order("modality", { ascending: true }),
  ]);

  const lessonsData = lessonsRes.data ?? [];
  const locationById = new Map(locationsList.map((loc) => [loc.id, loc.name]));
  const temaSemanaList = weekThemesRes.data ?? [];

  const allLessons = lessonsData;
  const lessons =
    allowedModalities.length === 0 ? [] : allowedModalities.length < MODALITIES_LIST.length ? allLessons.filter((l) => allowedModalities.includes(l.modality)) : allLessons;
  const nextLesson = lessons[0] ?? null;
  const restOfWeek = lessons.slice(1);

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

  const renderPresence = (lessonId: string) => {
    const att = attendanceByLesson[lessonId];
    return (
      <VouNaoVouButtons
        lessonId={lessonId}
        currentStatus={att?.status}
        checkedInAt={att?.checkedInAt ?? null}
        goingLabel={t("goingLabel")}
        notGoingLabel={t("notGoingLabel")}
        intentGoingLabel={t("intentGoingLabel")}
        checkInDoneLabel={t("checkInDoneLabel")}
        statusConfirmedLabel={STATUS_LABEL.CONFIRMED}
        statusAbsentLabel={STATUS_LABEL.ABSENT}
      />
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(20px, 5vw, 24px)" }}>
      {/* Agenda - apenas para planos com check-in */}
      {hasCheckIn && (
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

      {/* Tema da Semana — em destaque logo após a próxima aula, UX responsiva */}
      {temaSemanaList.length > 0 && (
        <section style={{ marginTop: "clamp(8px, 2vw, 12px)" }}>
          <h2 style={{ fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, marginBottom: "clamp(8px, 2vw, 12px)", color: "var(--text-primary)" }}>
            {t("weekThemeTitle")}
          </h2>
          <p style={{ margin: "0 0 clamp(12px, 3vw, 16px) 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
            {t("weekThemeDescription")}
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(12px, 3vw, 16px)" }}>
            {temaSemanaList.map((item) => (
              <li key={item.modality}>
                <div
                  className="card"
                  style={{
                    padding: "clamp(16px, 4vw, 20px)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "clamp(10px, 2.5vw, 12px)",
                  }}
                >
                  <span style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
                    {MODALITY_LABELS[item.modality] ?? item.modality}
                  </span>
                  <span style={{ fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
                    {item.title}
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                    {item.course_id && (
                      <Link
                        href={`/dashboard/biblioteca/${item.course_id}`}
                        className="btn btn-primary"
                        style={{
                          textDecoration: "none",
                          textAlign: "center",
                          minHeight: 44,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "clamp(14px, 3.5vw, 16px)",
                        }}
                      >
                        {t("viewTheoryVideo")} →
                      </Link>
                    )}
                    {(item as { video_url?: string | null }).video_url && (
                      <a
                        href={(item as { video_url: string }).video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn"
                        style={{
                          textAlign: "center",
                          minHeight: 44,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "clamp(14px, 3.5vw, 16px)",
                          background: "var(--surface)",
                          color: "var(--text-primary)",
                          textDecoration: "none",
                        }}
                      >
                        Ver vídeo →
                      </a>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
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
      )}

      {/* Trilhas de aprendizagem e plano digital — evidência na home */}
      <section
        className="card"
        style={{
          padding: "clamp(20px, 5vw, 28px)",
          background: "linear-gradient(135deg, var(--surface) 0%, var(--bg) 100%)",
          borderLeft: "4px solid var(--primary)",
        }}
      >
        <h2 style={{ margin: "0 0 8px 0", fontSize: "clamp(18px, 4.5vw, 22px)", fontWeight: 700, color: "var(--text-primary)" }}>
          {t("homeLearningPathsTitle")}
        </h2>
        <p style={{ margin: "0 0 4px 0", fontSize: "clamp(15px, 3.8vw, 17px)", color: "var(--text-primary)", lineHeight: 1.45 }}>
          {t("homeLearningPathsSubtitle")}
        </p>
        <p style={{ margin: "0 0 clamp(16px, 4vw, 20px) 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
          {hasDigitalAccess ? t("homeDigitalPlanYouHave") : t("homeDigitalPlanCta")}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "clamp(10px, 2.5vw, 12px)" }}>
          <Link
            href="/dashboard/biblioteca"
            className="btn btn-primary"
            style={{ textDecoration: "none", fontSize: "clamp(14px, 3.5vw, 16px)", minHeight: 44 }}
          >
            {t("homeGoToLibrary")}
          </Link>
          {!hasDigitalAccess && (
            <Link
              href="/dashboard/loja"
              className="btn"
              style={{
                textDecoration: "none",
                fontSize: "clamp(14px, 3.5vw, 16px)",
                minHeight: 44,
                background: "var(--surface)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
              }}
            >
              {t("homePlansAndStore")}
            </Link>
          )}
        </div>
      </section>

      <Suspense fallback={<DashboardRestSkeleton />}>
        <DashboardRestContent studentId={studentId} locale={locale as "pt" | "en"} hasPerformanceTracking={planAccess.hasPerformanceTracking} hasCheckIn={planAccess.hasCheckIn} />
      </Suspense>

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
