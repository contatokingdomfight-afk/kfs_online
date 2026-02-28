import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getThisWeekRange, formatLessonDate, MODALITY_LABELS } from "@/lib/lesson-utils";
import { loadEvaluationConfigForModality } from "@/lib/load-evaluation-config";
import { AttendanceRow } from "./AttendanceRow";

export default async function CoachAulaPage({
  searchParams,
}: {
  searchParams: Promise<{ lesson?: string }>;
}) {
  const supabase = await createClient();
  const { today, endOfWeek } = getThisWeekRange();
  const params = await searchParams;
  const selectedLessonId = params.lesson ?? null;

  const { data: lessonsData } = await supabase
    .from("Lesson")
    .select("id, modality, date, startTime, endTime, locationId")
    .gte("date", today)
    .lte("date", endOfWeek)
    .order("date", { ascending: true })
    .order("startTime", { ascending: true });

  const lessons = lessonsData ?? [];
  const locationIds = [...new Set((lessons as { locationId?: string }[]).map((l) => l.locationId).filter(Boolean))];
  const { data: locations } =
    locationIds.length > 0
      ? await supabase.from("Location").select("id, name").in("id", locationIds)
      : { data: [] as { id: string; name: string }[] };
  const locationById = new Map((locations ?? []).map((loc) => [loc.id, loc.name]));
  const lessonId =
    selectedLessonId && lessons.some((l) => l.id === selectedLessonId)
      ? selectedLessonId
      : lessons[0]?.id ?? null;
  const selectedLesson = lessonId ? lessons.find((l) => l.id === lessonId) : null;

  type AttWithProfile = {
    id: string;
    studentId: string;
    status: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
    phone: string | null;
    weightKg: number | null;
    heightCm: number | null;
    medicalNotes: string | null;
    emergencyContact: string | null;
    evaluatedInThisLesson: boolean;
  };
  let attendances: AttWithProfile[] = [];

  let evaluationConfig: Awaited<ReturnType<typeof loadEvaluationConfigForModality>> = null;
  if (selectedLesson) {
    evaluationConfig = await loadEvaluationConfigForModality(supabase, selectedLesson.modality);
  }

  if (lessonId && selectedLesson) {
    const { data: attList } = await supabase
      .from("Attendance")
      .select("id, studentId, status")
      .eq("lessonId", lessonId)
      .order("createdAt", { ascending: true });

    if (attList?.length) {
      const studentIds = attList.map((a) => a.studentId);
      const { data: students } = await supabase
        .from("Student")
        .select("id, userId")
        .in("id", studentIds);
      const userIds = [...new Set((students ?? []).map((s) => s.userId))];
      const { data: users } = await supabase
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

      const userById = new Map((users ?? []).map((u) => [u.id, u]));
      const profileByStudentId = new Map((profiles ?? []).map((p) => [p.studentId, p]));
      const studentToUser = new Map((students ?? []).map((s) => [s.id, userById.get(s.userId)]));

      attendances = attList.map((a) => {
        const u = studentToUser.get(a.studentId);
        const prof = profileByStudentId.get(a.studentId);
        const aid = athleteByStudentId.get(a.studentId);
        const evaluatedInThisLesson = aid ? evaluatedAthleteIds.has(aid) : false;
        return {
          id: a.id,
          studentId: a.studentId,
          status: a.status,
          name: u?.name ?? null,
          email: u?.email ?? "",
          avatarUrl: (u as { avatarUrl?: string | null } | undefined)?.avatarUrl ?? null,
          phone: prof?.phone ?? null,
          weightKg: prof?.weightKg != null ? Number(prof.weightKg) : null,
          heightCm: prof?.heightCm != null ? Number(prof.heightCm) : null,
          medicalNotes: prof?.medicalNotes ?? null,
          emergencyContact: prof?.emergencyContact ?? null,
          evaluatedInThisLesson,
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
          <section className="coach-aula-lesson-select" aria-label="Escolher aula">
            <label className="coach-aula-label">Escolhe a aula</label>
            <ul className="coach-aula-lesson-list" role="list">
              {lessons.map((l) => {
                const locName = (l as { locationId?: string }).locationId ? locationById.get((l as { locationId: string }).locationId) : null;
                return (
                <li key={l.id}>
                  <Link
                    href={`/coach/aula?lesson=${l.id}`}
                    className={`coach-aula-lesson-link ${l.id === lessonId ? "coach-aula-lesson-link--active" : ""}`}
                  >
                    <span className="coach-aula-lesson-modality">{MODALITY_LABELS[l.modality] ?? l.modality}</span>
                    <span className="coach-aula-lesson-meta">
                      {locName ? `${locName} · ` : ""}{formatLessonDate(l.date)} · {l.startTime}–{l.endTime}
                    </span>
                  </Link>
                </li>
              );
              })}
            </ul>
          </section>

          {selectedLesson && (
            <section className="coach-aula-presences" aria-labelledby="lista-presencas-heading">
              <div className="coach-aula-selected-bar">
                <div className="coach-aula-selected-info">
                  <span className="coach-aula-selected-modality">{MODALITY_LABELS[selectedLesson.modality] ?? selectedLesson.modality}</span>
                  <span className="coach-aula-selected-time">
                    {(selectedLesson as { locationId?: string }).locationId && locationById.get((selectedLesson as { locationId: string }).locationId)
                      ? `${locationById.get((selectedLesson as { locationId: string }).locationId)} · `
                      : ""}
                    {formatLessonDate(selectedLesson.date)} · {selectedLesson.startTime}–{selectedLesson.endTime}
                  </span>
                </div>
                <Link
                  href={`/coach/aula/qr?lesson=${selectedLesson.id}`}
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
                      lessonId={selectedLesson.id}
                      modality={selectedLesson.modality}
                      evaluationConfig={evaluationConfig}
                      evaluatedInThisLesson={a.evaluatedInThisLesson}
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
