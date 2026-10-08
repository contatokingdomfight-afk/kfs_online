import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarCheck, Check, ChevronLeft, ChevronRight, Clock, Flame, LineChart, X } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { getCachedLocations } from "@/lib/cached-reference-data";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import { getPlanAccess } from "@/lib/plan-access";
import { requirePlan } from "@/lib/require-plan";
import { calendarDateLisbon } from "@/lib/lesson-check-in-window";
import { weeksInARow } from "@/lib/attendance-streak";

const PAGE_SIZE = 30;

const card: React.CSSProperties = {
  borderRadius: 16,
  border: "1px solid var(--border)",
  backgroundColor: "var(--bg-secondary)",
};

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export default async function DashboardHistoricoPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; mes?: string }>;
}) {
  await requirePlan();
  const supabase = await createClient();
  const studentId = await getCurrentStudentId();
  const planAccess = await getPlanAccess(supabase, studentId);

  if (!planAccess.hasCheckIn) {
    redirect("/dashboard?message=plan-no-checkin");
  }

  const [locale, params] = await Promise.all([getLocaleFromCookies(), searchParams]);
  const pt = locale !== "en";
  const t = getTranslations(locale as "pt" | "en");
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const todayStr = calendarDateLisbon(new Date());
  const thisMonth = todayStr.slice(0, 7);
  const viewMonth = /^\d{4}-\d{2}$/.test(params.mes ?? "") && (params.mes as string) <= thisMonth ? (params.mes as string) : thisMonth;
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
    .select("id, lessonId, status, occurrenceDate")
    .eq("studentId", studentId)
    .range(0, 999);

  type AttRow = { id: string; lessonId: string; status: string; occurrenceDate: string | null };
  const attRows = (allAttData ?? []) as AttRow[];

  const pastAttRows = attRows.filter((a) => {
    const occ = a.occurrenceDate ? String(a.occurrenceDate).slice(0, 10) : null;
    return occ !== null && occ <= todayStr;
  });

  const pastLessonIds = [...new Set(pastAttRows.map((a) => a.lessonId))];

  type LessonRow = {
    id: string;
    modality: string;
    startTime: string;
    endTime: string;
    locationId?: string;
    schoolId?: string;
  };
  const lessonById = new Map<string, LessonRow>();
  if (pastLessonIds.length > 0) {
    let lessonsQuery = supabase
      .from("Lesson")
      .select("id, modality, startTime, endTime, locationId, schoolId")
      .in("id", pastLessonIds);
    if (studentSchoolId) lessonsQuery = lessonsQuery.eq("schoolId", studentSchoolId);
    const { data: lessons } = await lessonsQuery;
    for (const l of lessons ?? []) {
      lessonById.set(l.id, l as LessonRow);
    }
  }

  const allPastAttendances = pastAttRows
    .map((a) => {
      const lesson = lessonById.get(a.lessonId);
      if (!lesson) return null;
      const date = String(a.occurrenceDate).slice(0, 10);
      const locId = lesson.locationId;
      return {
        key: `${a.lessonId}_${date}`,
        lessonId: a.lessonId,
        modality: lesson.modality,
        date,
        startTime: lesson.startTime,
        endTime: lesson.endTime,
        status: a.status,
        locationName: locId ? locationById.get(locId) : undefined,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));

  const pastAttendances = allPastAttendances.slice(offset, offset + PAGE_SIZE);
  const hasMore = offset + PAGE_SIZE < allPastAttendances.length;

  // Números do topo.
  const confirmedDates = attRows
    .filter((a) => a.status === "CONFIRMED" && a.occurrenceDate)
    .map((a) => String(a.occurrenceDate).slice(0, 10));
  const monthCount = confirmedDates.filter((d) => d.startsWith(thisMonth)).length;
  const yearCount = confirmedDates.filter((d) => d.startsWith(todayStr.slice(0, 4))).length;
  const streak = weeksInARow(confirmedDates, todayStr);

  // Calendário do mês visto (segunda a domingo).
  const statusByDate = new Map<string, "CONFIRMED" | "PENDING" | "ABSENT">();
  for (const a of attRows) {
    if (!a.occurrenceDate) continue;
    const d = String(a.occurrenceDate).slice(0, 10);
    if (!d.startsWith(viewMonth)) continue;
    const prev = statusByDate.get(d);
    // Prioridade: presença confirmada > «Vou» > falta.
    if (a.status === "CONFIRMED" || (a.status === "PENDING" && prev !== "CONFIRMED") || (!prev && a.status === "ABSENT")) {
      statusByDate.set(d, a.status as "CONFIRMED" | "PENDING" | "ABSENT");
    }
  }
  const [vy, vm] = viewMonth.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(vy, vm, 0)).getUTCDate();
  const firstDow = (new Date(Date.UTC(vy, vm - 1, 1)).getUTCDay() + 6) % 7;
  const cells: Array<{ day: number; ymd: string } | null> = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      return { day, ymd: `${viewMonth}-${String(day).padStart(2, "0")}` };
    }),
  ];
  while (cells.length % 7) cells.push(null);
  const monthTitle = new Date(Date.UTC(vy, vm - 1, 1)).toLocaleDateString(pt ? "pt-PT" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  const viewMonthCount = [...statusByDate.values()].filter((s) => s === "CONFIRMED").length;
  const dow = pt ? ["S", "T", "Q", "Q", "S", "S", "D"] : ["M", "T", "W", "T", "F", "S", "S"];

  function formatLessonDate(dateStr: string): string {
    try {
      const [y, m, d] = dateStr.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString(pt ? "pt-PT" : "en-GB", { weekday: "short", day: "2-digit", month: "short" });
    } catch {
      return dateStr;
    }
  }

  const tiles = [
    { icon: <CalendarCheck size={20} />, bg: "rgba(74,222,128,0.16)", fg: "#4ade80", value: String(monthCount), label: pt ? "este mês" : "this month" },
    { icon: <Flame size={20} />, bg: "rgba(251,146,60,0.16)", fg: "#fb923c", value: String(streak), label: pt ? (streak === 1 ? "semana seguida" : "semanas seguidas") : "weeks in a row" },
    { icon: <LineChart size={20} />, bg: "rgba(96,165,250,0.16)", fg: "#60a5fa", value: String(yearCount), label: pt ? `em ${todayStr.slice(0, 4)}` : `in ${todayStr.slice(0, 4)}` },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 1080, margin: "0 auto", width: "100%", paddingBottom: 24 }}>
      <header>
        <h1 style={{ fontSize: "clamp(22px, 5.5vw, 28px)", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
          {t("dashboardHistoricoTitle")}
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>{t("dashboardHistoricoDescription")}</p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
        {tiles.map((tile) => (
          <div key={tile.label} style={{ ...card, padding: "14px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
            <span aria-hidden style={{ width: 34, height: 34, borderRadius: 10, background: tile.bg, color: tile.fg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {tile.icon}
            </span>
            <span style={{ fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 800, lineHeight: 1 }}>{tile.value}</span>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{tile.label}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "flex-start" }}>
        {/* Calendário */}
        <section aria-label={monthTitle} style={{ ...card, flex: "1 1 340px", minWidth: 0, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link
              href={`/dashboard/historico?mes=${shiftMonth(viewMonth, -1)}`}
              aria-label={pt ? "Mês anterior" : "Previous month"}
              style={{ width: 36, height: 36, borderRadius: 18, border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-primary)" }}
            >
              <ChevronLeft size={18} aria-hidden />
            </Link>
            <span style={{ flex: 1, textAlign: "center" }}>
              <span style={{ display: "block", fontSize: 16, fontWeight: 800, textTransform: "capitalize" }}>{monthTitle}</span>
              <span style={{ display: "block", fontSize: 12, color: "var(--text-secondary)" }}>
                {viewMonthCount} {pt ? (viewMonthCount === 1 ? "treino" : "treinos") : viewMonthCount === 1 ? "session" : "sessions"}
              </span>
            </span>
            {viewMonth < thisMonth ? (
              <Link
                href={`/dashboard/historico?mes=${shiftMonth(viewMonth, 1)}`}
                aria-label={pt ? "Mês seguinte" : "Next month"}
                style={{ width: 36, height: 36, borderRadius: 18, border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-primary)" }}
              >
                <ChevronRight size={18} aria-hidden />
              </Link>
            ) : (
              <span style={{ width: 36 }} />
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6, textAlign: "center" }}>
            {dow.map((d, i) => (
              <span key={i} style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)" }}>
                {d}
              </span>
            ))}
            {cells.map((c, i) => {
              if (!c) return <span key={`e${i}`} />;
              const st = statusByDate.get(c.ymd);
              const isToday = c.ymd === todayStr;
              const future = c.ymd > todayStr;
              return (
                <span
                  key={c.ymd}
                  title={st ? STATUS_LABEL[st] : undefined}
                  style={{
                    aspectRatio: "1",
                    borderRadius: 10,
                    boxSizing: "border-box",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: st === "CONFIRMED" ? 800 : 600,
                    background: st === "CONFIRMED" ? "var(--primary)" : future ? "transparent" : "var(--bg)",
                    color: st === "CONFIRMED" ? "#fff" : future ? "var(--text-secondary)" : "var(--text-primary)",
                    border: isToday
                      ? "2px solid var(--text-primary)"
                      : st === "PENDING"
                        ? "2px dashed var(--primary)"
                        : st === "ABSENT"
                          ? "1px solid var(--danger)"
                          : "1px solid transparent",
                    opacity: future && !st ? 0.5 : 1,
                  }}
                >
                  {c.day}
                </span>
              );
            })}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 12, color: "var(--text-secondary)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: 4, background: "var(--primary)" }} />
              {pt ? "Treinaste" : "Trained"}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: 4, border: "2px dashed var(--primary)", boxSizing: "border-box" }} />
              {pt ? "Vou" : "Going"}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: 4, border: "2px solid var(--text-primary)", boxSizing: "border-box" }} />
              {pt ? "Hoje" : "Today"}
            </span>
          </div>
        </section>

        {/* Últimas aulas */}
        <section style={{ flex: "1 1 320px", minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>{t("presenceHistory")}</h2>
          {pastAttendances.length === 0 ? (
            <div style={{ ...card, padding: 20 }}>
              <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>{t("dashboardHistoricoEmpty")}</p>
            </div>
          ) : (
            <>
              <ul style={{ ...card, listStyle: "none", padding: 0, margin: 0, overflow: "hidden" }}>
                {pastAttendances.map((a, i) => {
                  const ok = a.status === "CONFIRMED";
                  const absent = a.status === "ABSENT";
                  return (
                    <li key={a.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderTop: i > 0 ? "1px solid var(--border)" : "none" }}>
                      <span
                        aria-hidden
                        style={{
                          width: 38,
                          height: 38,
                          flexShrink: 0,
                          borderRadius: 19,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: ok ? "rgba(74,222,128,0.16)" : absent ? "rgba(248,113,113,0.16)" : "var(--bg)",
                          color: ok ? "#4ade80" : absent ? "#f87171" : "var(--text-secondary)",
                        }}
                      >
                        {ok ? <Check size={18} /> : absent ? <X size={18} /> : <Clock size={18} />}
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{MODALITY_LABELS[a.modality] ?? a.modality}</span>
                        <span style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginTop: 2, textTransform: "capitalize" }}>
                          {formatLessonDate(a.date)} · {a.startTime}–{a.endTime}
                          {a.locationName ? ` · ${a.locationName}` : ""}
                        </span>
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: ok ? "var(--success)" : absent ? "var(--danger)" : "var(--text-secondary)", whiteSpace: "nowrap" }}>
                        {STATUS_LABEL[a.status] ?? a.status}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {(hasMore || page > 1) && (
                <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                  {page > 1 && (
                    <Link href={`/dashboard/historico?page=${page - 1}&mes=${viewMonth}`} className="btn btn-secondary" style={{ textDecoration: "none" }}>
                      ← {t("back")}
                    </Link>
                  )}
                  {hasMore && (
                    <Link href={`/dashboard/historico?page=${page + 1}&mes=${viewMonth}`} className="btn btn-primary" style={{ textDecoration: "none" }}>
                      {t("dashboardHistoricoLoadMore")} →
                    </Link>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
