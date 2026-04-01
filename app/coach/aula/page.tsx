import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getThisWeekRange, formatLessonDate, MODALITY_LABELS } from "@/lib/lesson-utils";
import {
  expandLessonsForDateRange,
  fetchLessonCancellations,
  rowsToLessonDefinitions,
} from "@/lib/lesson-occurrences";
import { loadEvaluationConfigForModality } from "@/lib/load-evaluation-config";
import { getCachedLocations } from "@/lib/cached-reference-data";
import { AttendanceRow } from "./AttendanceRow";

export default async function CoachAulaPage({
  searchParams,
}: {
  searchParams: Promise<{ lesson?: string; date?: string }>;
}) {
  const supabase = await createClient();
  const { today, endOfWeek } = getThisWeekRange();
  const params = await searchParams;
  const selectedLessonId = params.lesson ?? null;
  const dateParam = params.date?.trim().slice(0, 10) ?? null;

  const { data: lessonsRaw } = await supabase
    .from("Lesson")
    .select(
      "id, modality, date, weekday, startTime, endTime, locationId, schoolId, isOneOff, coachId, isOpenClass, capacity, planningNotes"
    )
    .order("startTime", { ascending: true });

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

  type AttWithProfile = {
    id: string;
    studentId: string;
    status: string;
    checkedInAt: string | null;
    name: string | null;
    email: string;
    avatarUrl: string | null;
    phone: string | null;
    weightKg: number | null;
    heightCm: number | null;
    medicalNotes: string | null;
    emergencyContact: string | null;
    evaluatedInThisLesson: boolean;
    lastEvalScoresByModality?: Record<string, Record<string, number>>;
  };
  let attendances: AttWithProfile[] = [];

  let evaluationConfig: Awaited<ReturnType<typeof loadEvaluationConfigForModality>> = null;
  if (selectedLesson?.modality) {
    evaluationConfig = await loadEvaluationConfigForModality(supabase, selectedLesson.modality);
  }

  const occurrenceYmd = selectedLesson?.occurrenceDate ?? "";

  if (lessonId && selectedLesson && occurrenceYmd) {
    const { data: attList } = await supabase
      .from("Attendance")
      .select("id, studentId, status, checkedInAt, occurrenceDate")
      .eq("lessonId", lessonId)
      .eq("occurrenceDate", occurrenceYmd)
      .order("createdAt", { ascending: true });

    if (attList?.length) {
      const studentIds = attList.map((a) => a.studentId);
      // Student e User têm RLS restritivo; admin client bypassa para coach ver lista de presenças
      const adminSupabase = getAdminClientOrNull().client ?? supabase;
      const { data: students } = await adminSupabase
        .from("Student")
        .select("id, userId")
        .in("id", studentIds);
      const userIds = [...new Set((students ?? []).map((s) => s.userId))];
      const { data: users } = await adminSupabase
        .from("User")
        .select("id, name, email, avatarUrl")
        .in("id", userIds);
      const { data: profiles } = await supabase
        .from("StudentProfile")
        .select("studentId, weightKg, heightCm, medicalNotes, emergencyContact, phone")
        .in("studentId", studentIds);
      const { data: athletes } = await supabase
        .from("Athlete")
        .select("id, studentId")
        .in("studentId", studentIds);
      const athleteByStudentId = new Map((athletes ?? []).map((a) => [a.studentId, a.id]));
      const athleteIds = [...athleteByStudentId.values()];
      const { data: evals } =
        athleteIds.length > 0
          ? await supabase
              .from("AthleteEvaluation")
              .select("athleteId")
              .eq("lessonId", lessonId)
              .in("athleteId", athleteIds)
          : { data: [] as { athleteId: string }[] };
      const evaluatedAthleteIds = new Set((evals ?? []).map((e) => e.athleteId));

      const lessonModality = selectedLesson.modality ?? "";
      const { data: lastEvals } =
        athleteIds.length > 0 && lessonModality
          ? await supabase
              .from("AthleteEvaluation")
              .select("athleteId, scores")
              .eq("modality", lessonModality)
              .in("athleteId", athleteIds)
              .not("scores", "is", null)
              .order("created_at", { ascending: false })
          : { data: [] as { athleteId: string; scores: Record<string, number> | null }[] };
      const lastScoresByAthleteId = new Map<string, Record<string, number>>();
      for (const e of lastEvals ?? []) {
        if (!lastScoresByAthleteId.has(e.athleteId) && e.scores && typeof e.scores === "object" && Object.keys(e.scores).length > 0) {
          lastScoresByAthleteId.set(e.athleteId, e.scores as Record<string, number>);
        }
      }

      const userById = new Map((users ?? []).map((u) => [u.id, u]));
      const profileByStudentId = new Map((profiles ?? []).map((p) => [p.studentId, p]));
      const studentToUser = new Map((students ?? []).map((s) => [s.id, userById.get(s.userId)]));

      attendances = attList.map((a) => {
        const u = studentToUser.get(a.studentId);
        const prof = profileByStudentId.get(a.studentId);
        const aid = athleteByStudentId.get(a.studentId);
        const evaluatedInThisLesson = aid ? evaluatedAthleteIds.has(aid) : false;
        const lastScores = aid ? lastScoresByAthleteId.get(aid) : undefined;
        const lastEvalScoresByModality =
          lastScores && lessonModality ? { [lessonModality]: lastScores } : undefined;
        return {
          id: a.id,
          studentId: a.studentId,
          status: a.status,
          checkedInAt: (a as { checkedInAt?: string | null }).checkedInAt ?? null,
          name: u?.name ?? null,
          email: u?.email ?? "",
          avatarUrl: (u as { avatarUrl?: string | null } | undefined)?.avatarUrl ?? null,
          phone: prof?.phone ?? null,
          weightKg: prof?.weightKg != null ? Number(prof.weightKg) : null,
          heightCm: prof?.heightCm != null ? Number(prof.heightCm) : null,
          medicalNotes: prof?.medicalNotes ?? null,
          emergencyContact: prof?.emergencyContact ?? null,
          evaluatedInThisLesson,
          lastEvalScoresByModality,
        };
      });
    }
  }

  return (
    <div className="coach-aula-page">
      <header className="coach-aula-header">
        <Link href="/coach" className="coach-aula-back">
          ← Voltar
        </Link>
        <h1 className="coach-aula-title">Presenças na aula</h1>
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

              <h2 id="lista-presencas-heading" className="coach-aula-list-title">
                Lista de presenças
              </h2>

              {attendances.length === 0 ? (
                <div className="coach-aula-empty-list">
                  <span className="coach-aula-empty-icon" aria-hidden>👥</span>
                  <p>Ninguém marcou presença ainda.</p>
                  <p className="coach-aula-empty-hint">Os alunos podem fazer check-in com o QR Code da aula.</p>
                </div>
              ) : (
                <ul className="coach-aula-attendance-list" role="list">
                  {attendances.map((a) => (
                    <AttendanceRow
                      key={a.id}
                      attendanceId={a.id}
                      studentId={a.studentId}
                      studentName={a.name}
                      studentEmail={a.email}
                      status={a.status}
                      checkedInAt={a.checkedInAt}
                      lessonId={selectedLesson.id}
                      modality={selectedLesson.modality ?? ""}
                      evaluationConfig={evaluationConfig}
                      evaluatedInThisLesson={a.evaluatedInThisLesson}
                      lastEvalScoresByModality={a.lastEvalScoresByModality}
                      profile={{
                        name: a.name,
                        email: a.email,
                        avatarUrl: a.avatarUrl,
                        phone: a.phone,
                        weightKg: a.weightKg,
                        heightCm: a.heightCm,
                        medicalNotes: a.medicalNotes,
                        emergencyContact: a.emergencyContact,
                      }}
                    />
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
