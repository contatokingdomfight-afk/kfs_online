import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getThisWeekRange, formatLessonDate, MODALITY_LABELS } from "@/lib/lesson-utils";
import { getWeekStartMondayForDateInLisbon } from "@/lib/lisbon-week";
import {
  expandLessonsForDateRange,
  fetchLessonCancellations,
  rowsToLessonDefinitions,
} from "@/lib/lesson-occurrences";
import { loadEvaluationConfigForModality } from "@/lib/load-evaluation-config";
import { getCachedLocations } from "@/lib/cached-reference-data";
import type { Locale } from "@/lib/i18n";
import { RoundTimerClient } from "@/components/coach/round-timer/RoundTimerClient";
import { AcceptTrialButton } from "@/app/admin/experimentais/AcceptTrialButton";
import { ConvertTrialButton } from "@/app/admin/experimentais/ConvertTrialButton";
import { CoachAulaRosterPanel } from "./CoachAulaRosterPanel";
import { getActiveSchoolAssistantForUserId } from "@/lib/school-assistant-coach";
import { loadCoachLessonRoster } from "@/lib/coach-lesson-eligible-students";

export default async function CoachAulaPage({
  searchParams,
}: {
  searchParams: Promise<{ lesson?: string; date?: string }>;
}) {
  const supabase = await createClient();
  const dbUser = await getCurrentDbUser();
  const schoolAssistant =
    dbUser?.role === "ALUNO" ? await getActiveSchoolAssistantForUserId(supabase, dbUser.id) : null;
  const canEvaluateLesson = !schoolAssistant;
  const showTrialsAndWeekLibrary = !schoolAssistant;

  const { today, endOfWeek } = getThisWeekRange();
  const params = await searchParams;
  const selectedLessonId = params.lesson ?? null;
  const dateParam = params.date?.trim().slice(0, 10) ?? null;

  let lessonsRaw = (await supabase
    .from("Lesson")
    .select(
      "id, modality, date, weekday, startTime, endTime, locationId, schoolId, isOneOff, coachId, isOpenClass, capacity, planningNotes"
    )
    .order("startTime", { ascending: true })).data ?? [];

  if (schoolAssistant) {
    lessonsRaw = lessonsRaw.filter((row) => (row as { schoolId?: string }).schoolId === schoolAssistant.schoolId);
  }

  const lessonIdsAll = (lessonsRaw ?? []).map((l) => (l as { id: string }).id);
  const cancellations = await fetchLessonCancellations(supabase, lessonIdsAll);
  const lessonsAsDefs = rowsToLessonDefinitions(lessonsRaw ?? []);
  const lessons = expandLessonsForDateRange(lessonsAsDefs, cancellations, today, endOfWeek);

  const locationIds = [...new Set(lessons.map((l) => l.locationId).filter(Boolean))] as string[];
  const allLocations = await getCachedLocations(supabase);
  const locations = locationIds.length > 0 ? allLocations.filter((l) => locationIds.includes(l.id)) : [];
  const locationById = new Map(locations.map((loc) => [loc.id, loc.name]));

  const resolveSelected = () => {
    if (!selectedLessonId || !lessons.some((l) => l.id === selectedLessonId)) return { lessonId: null as string | null, selectedLesson: null };
    if (dateParam) {
      const row = lessons.find((l) => l.id === selectedLessonId && l.occurrenceDate === dateParam);
      if (row) return { lessonId: selectedLessonId, selectedLesson: row };
    }
    const first = lessons.find((l) => l.id === selectedLessonId);
    return { lessonId: selectedLessonId, selectedLesson: first ?? null };
  };
  const { lessonId, selectedLesson } = resolveSelected();

  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale);
  const timerLocale = (locale === "en" ? "en" : "pt") as Locale;

  let rosterStudents: Awaited<ReturnType<typeof loadCoachLessonRoster>>["students"] = [];

  let evaluationConfig: Awaited<ReturnType<typeof loadEvaluationConfigForModality>> = null;
  if (selectedLesson?.modality) {
    evaluationConfig = await loadEvaluationConfigForModality(supabase, selectedLesson.modality);
  }

  const occurrenceYmd = selectedLesson?.occurrenceDate ?? "";

  let weekThemeThisLesson: { title: string; description: string | null; course_id: string | null; unit_id: string | null; video_url: string | null } | null = null;
  if (selectedLesson?.modality && occurrenceYmd) {
    const weekStart = getWeekStartMondayForDateInLisbon(occurrenceYmd);
    const { data: wt } = await supabase
      .from("WeekTheme")
      .select("title, description, course_id, unit_id, video_url")
      .eq("week_start", weekStart)
      .eq("modality", selectedLesson.modality)
      .maybeSingle();
    if (wt) weekThemeThisLesson = wt;
  }

  if (lessonId && selectedLesson && occurrenceYmd && selectedLesson.schoolId) {
    const adminSupabase = getAdminClientOrNull().client ?? supabase;
    const roster = await loadCoachLessonRoster(adminSupabase, {
      lessonId,
      occurrenceYmd,
      schoolId: selectedLesson.schoolId,
      modality: selectedLesson.modality ?? "",
      isOpenClass: Boolean(selectedLesson.isOpenClass),
    });
    rosterStudents = roster.students;
  }

  type TrialInSession = {
    id: string;
    name: string;
    contact: string;
    modality: string;
    acceptedAt: string | null;
  };
  let trialsInSession: TrialInSession[] = [];
  if (lessonId && occurrenceYmd) {
    const { data: trialList } = await supabase
      .from("TrialClass")
      .select("id, name, contact, modality, acceptedAt")
      .eq("lessonId", lessonId)
      .eq("lessonDate", occurrenceYmd)
      .eq("convertedToStudent", false)
      .order("createdAt", { ascending: true });
    trialsInSession = (trialList ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      contact: row.contact,
      modality: String(row.modality),
      acceptedAt: (row as { acceptedAt?: string | null }).acceptedAt ?? null,
    }));
  }

  return (
    <div className="coach-aula-page">
      <header className="coach-aula-header">
        <Link href="/coach" className="coach-aula-back">
          ← Voltar
        </Link>
        <h1 className="coach-aula-title" style={{ flex: 1, minWidth: 0 }}>
          Presenças na aula
        </h1>
      </header>

      {lessons.length === 0 ? (
        <div className="coach-aula-empty-state">
          <p>Nenhuma aula esta semana.</p>
        </div>
      ) : (
        <>
          {!selectedLesson ? (
            <section className="coach-aula-lesson-select" aria-label="Escolher aula">
              <label className="coach-aula-label">Escolhe a aula</label>
              <p style={{ margin: "0 0 12px 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                Clica numa aula para ver e gerir a lista de presenças.
              </p>
              <ul className="coach-aula-lesson-list" role="list">
                {lessons.map((l) => {
                  const locName = l.locationId ? locationById.get(l.locationId) : null;
                  return (
                    <li key={l.occurrenceKey}>
                      <Link
                        href={`/coach/aula?lesson=${l.id}&date=${encodeURIComponent(l.occurrenceDate)}`}
                        className="coach-aula-lesson-link"
                      >
                        <span className="coach-aula-lesson-modality">{MODALITY_LABELS[l.modality ?? ""] ?? l.modality ?? ""}</span>
                        <span className="coach-aula-lesson-meta">
                          {locName ? `${locName} · ` : ""}{formatLessonDate(l.occurrenceDate)} · {l.startTime}–{l.endTime}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : (
            <section className="coach-aula-presences" aria-labelledby="lista-presencas-heading">
              <div className="coach-aula-selected-bar">
                <Link href="/coach/aula" style={{ color: "var(--text-secondary)", fontSize: "clamp(14px, 3.5vw, 16px)", textDecoration: "none", marginRight: "auto" }}>
                  ← Trocar aula
                </Link>
                <div className="coach-aula-selected-info">
                  <span className="coach-aula-selected-modality">{MODALITY_LABELS[selectedLesson.modality ?? ""] ?? selectedLesson.modality ?? ""}</span>
                  <span className="coach-aula-selected-time">
                    {selectedLesson.locationId && locationById.get(selectedLesson.locationId)
                      ? `${locationById.get(selectedLesson.locationId)} · `
                      : ""}
                    {formatLessonDate(selectedLesson.occurrenceDate)} · {selectedLesson.startTime}–{selectedLesson.endTime}
                  </span>
                </div>
                <Link
                  href={`/coach/aula/qr?lesson=${selectedLesson.id}&date=${encodeURIComponent(selectedLesson.occurrenceDate)}`}
                  className="btn btn-secondary coach-aula-qr-btn"
                >
                  <span aria-hidden>📱</span> QR Code
                </Link>
              </div>

              {showTrialsAndWeekLibrary && weekThemeThisLesson ? (
                <section
                  className="coach-aula-week-theme"
                  style={{
                    marginBottom: "clamp(16px, 4vw, 20px)",
                    padding: "clamp(12px, 3vw, 16px)",
                    borderRadius: "var(--radius-md)",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                  }}
                  aria-labelledby="coach-aula-week-theme-h"
                >
                  <h2 id="coach-aula-week-theme-h" className="coach-aula-list-title" style={{ fontSize: "clamp(15px, 3.5vw, 16px)", marginTop: 0, marginBottom: 8 }}>
                    {t("coachAulaWeekThemeTitle")}
                  </h2>
                  <p style={{ margin: "0 0 10px 0", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>{weekThemeThisLesson.title}</p>
                  {weekThemeThisLesson.description ? (
                    <p
                      style={{
                        margin: "0 0 10px 0",
                        fontSize: "clamp(14px, 3.5vw, 16px)",
                        color: "var(--text-secondary)",
                        lineHeight: 1.55,
                        whiteSpace: "pre-line",
                      }}
                    >
                      {weekThemeThisLesson.description}
                    </p>
                  ) : null}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {weekThemeThisLesson.unit_id && weekThemeThisLesson.course_id ? (
                      <Link
                        href={`/coach/biblioteca/${weekThemeThisLesson.course_id}#unit-${weekThemeThisLesson.unit_id}`}
                        className="btn btn-secondary"
                        style={{ textDecoration: "none", minHeight: 40 }}
                      >
                        {t("dashboardViewLesson")}
                      </Link>
                    ) : null}
                    {weekThemeThisLesson.course_id ? (
                      <Link href={`/coach/biblioteca/${weekThemeThisLesson.course_id}`} className="btn btn-secondary" style={{ textDecoration: "none", minHeight: 40 }}>
                        {t("dashboardViewTheory")}
                      </Link>
                    ) : null}
                    {weekThemeThisLesson.video_url ? (
                      <a
                        href={weekThemeThisLesson.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary"
                        style={{ textDecoration: "none", minHeight: 40, display: "inline-flex", alignItems: "center" }}
                      >
                        {t("dashboardViewVideo")}
                      </a>
                    ) : null}
                  </div>
                </section>
              ) : null}

              <section className="coach-aula-timer-section" aria-labelledby="coach-aula-timer-heading">
                <h2 id="coach-aula-timer-heading" className="coach-aula-list-title">
                  {t("navRoundTimer")}
                </h2>
                <RoundTimerClient locale={timerLocale} variant="embedded" />
              </section>

              {showTrialsAndWeekLibrary && trialsInSession.length > 0 ? (
                <section
                  className="coach-aula-trials-section"
                  aria-labelledby="coach-aula-trials-heading"
                  style={{
                    marginBottom: "clamp(16px, 4vw, 20px)",
                    padding: "clamp(12px, 3vw, 16px)",
                    borderRadius: "var(--radius-md)",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <h2 id="coach-aula-trials-heading" className="coach-aula-list-title" style={{ marginTop: 0 }}>
                    {t("coachAulaTrialsTitle")}
                  </h2>
                  <p className="coach-aula-wellness-hint" style={{ margin: "0 0 12px 0", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {t("coachAulaTrialsIntro")}
                  </p>
                  <ul className="coach-aula-attendance-list" role="list" style={{ margin: 0 }}>
                    {trialsInSession.map((tr) => (
                      <li
                        key={tr.id}
                        className="coach-aula-trial-row"
                        style={{
                          listStyle: "none",
                          padding: "clamp(12px, 3vw, 14px)",
                          borderRadius: "var(--radius-sm)",
                          background: "var(--bg)",
                          border: "1px solid var(--border)",
                          marginBottom: 8,
                        }}
                      >
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 8 }}>
                          <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{tr.name}</span>
                          <span
                            style={{
                              fontSize: "clamp(11px, 2.8vw, 12px)",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                              color: "var(--primary)",
                              border: "1px solid var(--border)",
                              borderRadius: 999,
                              padding: "2px 8px",
                            }}
                          >
                            {t("coachTrialInSessionBadge")}
                          </span>
                          {tr.acceptedAt ? (
                            <span
                              style={{
                                fontSize: "clamp(11px, 2.8vw, 12px)",
                                fontWeight: 600,
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                                color: "#fff",
                                backgroundColor: "var(--info, #0ea5e9)",
                                borderRadius: 999,
                                padding: "2px 8px",
                              }}
                            >
                              Aceite
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: "clamp(11px, 2.8vw, 12px)",
                                fontWeight: 600,
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                                color: "var(--text-primary)",
                                backgroundColor: "var(--warning)",
                                borderRadius: 999,
                                padding: "2px 8px",
                              }}
                            >
                              Pendente
                            </span>
                          )}
                        </div>
                        <p style={{ margin: "6px 0 0 0", fontSize: "clamp(14px, 3.5vw, 15px)", color: "var(--text-secondary)" }}>
                          {tr.contact}
                        </p>
                        <p style={{ margin: "4px 0 0 0", fontSize: "clamp(13px, 3.2vw, 14px)", color: "var(--text-secondary)" }}>
                          {MODALITY_LABELS[tr.modality] ?? tr.modality}
                        </p>
                        <div
                          style={{
                            marginTop: "clamp(8px, 2vw, 12px)",
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          {!tr.acceptedAt ? <AcceptTrialButton trialId={tr.id} /> : null}
                          {tr.contact.includes("@") ? <ConvertTrialButton trialId={tr.id} /> : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/coach/experimentais"
                    className="btn btn-secondary"
                    style={{ marginTop: 12, textDecoration: "none", display: "inline-block" }}
                  >
                    {t("coachManageAllTrials")} →
                  </Link>
                </section>
              ) : null}

              <h2 id="lista-presencas-heading" className="coach-aula-list-title">
                Lista de presenças
              </h2>
              <p className="coach-aula-wellness-hint" style={{ margin: "0 0 16px 0", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Alunos ativos elegíveis para esta aula (por plano/modalidade). Pesquisa por nome para marcar presença mesmo sem pré-confirmação «Vou». Pré-treino e RPE aparecem quando o aluno os regista na app.
              </p>

              <CoachAulaRosterPanel
                students={rosterStudents}
                lessonId={selectedLesson.id}
                occurrenceDate={selectedLesson.occurrenceDate}
                modality={selectedLesson.modality ?? ""}
                evaluationConfig={evaluationConfig}
                canEvaluate={canEvaluateLesson}
              />
            </section>
          )}
        </>
      )}
    </div>
  );
}
