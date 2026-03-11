import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentCoachId } from "@/lib/auth/get-current-coach";
import { getCurrentSchoolId } from "@/lib/auth/get-current-school";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { MODALITY_LABELS, formatLessonDate } from "@/lib/lesson-utils";

const DAYS_NAO_AVALIADOS = 20;

type TodayLessonWithPresences = {
  id: string;
  modality: string;
  startTime: string;
  endTime: string;
  confirmed: number;
  pending: number;
  absent: number;
};

export default async function CoachHomePage() {
  const dbUser = await getCurrentDbUser();
  const [coachId, schoolId, locale] = await Promise.all([
    getCurrentCoachId(),
    getCurrentSchoolId(),
    getLocaleFromCookies(),
  ]);
  const t = getTranslations(locale as "pt" | "en");
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - DAYS_NAO_AVALIADOS);
  const sinceIso = sinceDate.toISOString().slice(0, 10);

  // Próximas aulas (filtradas por coach)
  let lessonsQuery = supabase
    .from("Lesson")
    .select("id, modality, date, startTime, endTime, schoolId")
    .gte("date", today)
    .order("date", { ascending: true })
    .order("startTime", { ascending: true })
    .limit(5);

  if (coachId) {
    lessonsQuery = lessonsQuery.eq("coachId", coachId);
  }
  if (schoolId) {
    lessonsQuery = lessonsQuery.eq("schoolId", schoolId);
  }

  const { data: lessons } = await lessonsQuery;
  const nextLesson = lessons?.[0] ?? null;

  // Estatísticas: total alunos na escola
  let totalStudents = 0;
  let studentsQuery = supabase.from("Student").select("id", { count: "exact", head: true }).eq("status", "ATIVO");
  if (schoolId) {
    studentsQuery = studentsQuery.eq("schoolId", schoolId);
  }
  const { count: studentsCount } = await studentsQuery;
  totalStudents = studentsCount ?? 0;

  // Estatísticas: aulas esta semana (do coach)
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekStartIso = weekStart.toISOString().slice(0, 10);
  const weekEndIso = weekEnd.toISOString().slice(0, 10);

  let weekLessonsQuery = supabase
    .from("Lesson")
    .select("id", { count: "exact", head: true })
    .gte("date", weekStartIso)
    .lte("date", weekEndIso);
  if (coachId) {
    weekLessonsQuery = weekLessonsQuery.eq("coachId", coachId);
  }
  if (schoolId) {
    weekLessonsQuery = weekLessonsQuery.eq("schoolId", schoolId);
  }
  const { count: weekLessonsCount } = await weekLessonsQuery;
  const lessonsThisWeek = weekLessonsCount ?? 0;

  // Presenças hoje: aulas do coach hoje + contagem por status
  let todayLessonsQuery = supabase
    .from("Lesson")
    .select("id, modality, startTime, endTime")
    .eq("date", today)
    .order("startTime", { ascending: true });
  if (coachId) {
    todayLessonsQuery = todayLessonsQuery.eq("coachId", coachId);
  }
  if (schoolId) {
    todayLessonsQuery = todayLessonsQuery.eq("schoolId", schoolId);
  }
  const { data: todayLessons } = await todayLessonsQuery;

  let todayPresences: TodayLessonWithPresences[] = [];
  let totalPresencesToday = 0;
  if (todayLessons && todayLessons.length > 0) {
    const lessonIds = todayLessons.map((l) => l.id);
    const { data: attendances } = await supabase
      .from("Attendance")
      .select("lessonId, status")
      .in("lessonId", lessonIds);

    const byLesson = new Map<string, { confirmed: number; pending: number; absent: number }>();
    for (const lid of lessonIds) {
      byLesson.set(lid, { confirmed: 0, pending: 0, absent: 0 });
    }
    for (const a of attendances ?? []) {
      const m = byLesson.get(a.lessonId);
      if (m) {
        if (a.status === "CONFIRMED") m.confirmed++;
        else if (a.status === "PENDING") m.pending++;
        else m.absent++;
      }
    }
    todayPresences = todayLessons.map((l) => {
      const m = byLesson.get(l.id)!;
      totalPresencesToday += m.confirmed + m.pending + m.absent;
      return {
        id: l.id,
        modality: l.modality,
        startTime: l.startTime,
        endTime: l.endTime,
        confirmed: m.confirmed,
        pending: m.pending,
        absent: m.absent,
      };
    });
  }

  // Alunos sem avaliação (últimos N dias)
  type AlunoNaoAvaliado = { studentId: string; name: string | null };
  let alunosNaoAvaliados: AlunoNaoAvaliado[] = [];
  if (coachId) {
    const { data: lessonsLast20 } = await supabase
      .from("Lesson")
      .select("id")
      .eq("coachId", coachId)
      .gte("date", sinceIso);
    if (schoolId) {
      // Filter by school if coach has one
      // lessonsLast20 is already coach's lessons - they're at coach's school
    }
    const lessonIds = (lessonsLast20 ?? []).map((l) => l.id);
    if (lessonIds.length > 0) {
      const { data: attendances } = await supabase
        .from("Attendance")
        .select("studentId")
        .in("lessonId", lessonIds);
      const studentIds = [...new Set((attendances ?? []).map((a) => a.studentId))];
      if (studentIds.length > 0) {
        const { data: athletes } = await supabase
          .from("Athlete")
          .select("id, studentId")
          .in("studentId", studentIds);
        const athleteIds = (athletes ?? []).map((a) => a.id);
        const { data: evaluated } =
          athleteIds.length > 0
            ? await supabase
                .from("AthleteEvaluation")
                .select("athleteId")
                .eq("coachId", coachId)
                .gte("created_at", sinceDate.toISOString())
                .in("athleteId", athleteIds)
            : { data: [] as { athleteId: string }[] };
        const evaluatedSet = new Set((evaluated ?? []).map((e) => e.athleteId));
        const athleteByStudent = new Map((athletes ?? []).map((a) => [a.studentId, a.id]));
        const notEvaluatedStudentIds = studentIds.filter((sid) => {
          const aid = athleteByStudent.get(sid);
          return aid && !evaluatedSet.has(aid);
        });
        if (notEvaluatedStudentIds.length > 0) {
          const { data: students } = await supabase
            .from("Student")
            .select("id, userId")
            .in("id", notEvaluatedStudentIds);
          const userIds = [...new Set((students ?? []).map((s) => s.userId))];
          const { data: users } = await supabase
            .from("User")
            .select("id, name")
            .in("id", userIds);
          const userById = new Map((users ?? []).map((u) => [u.id, u]));
          const studentToUser = new Map((students ?? []).map((s) => [s.id, userById.get(s.userId)]));
          alunosNaoAvaliados = notEvaluatedStudentIds
            .map((studentId) => {
              const u = studentToUser.get(studentId);
              return { studentId, name: u?.name ?? null };
            })
            .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "pt"));
        }
      }
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(20px, 5vw, 24px)", maxWidth: "min(480px, 100%)" }}>
      <p style={{ margin: 0, fontSize: "clamp(15px, 3.8vw, 17px)", color: "var(--text-secondary)" }}>
        {t("helloCoach")} {dbUser?.name || t("coach")} 👋
      </p>

      {/* Stats cards */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "clamp(8px, 2vw, 12px)" }}>
        <div
          className="card"
          style={{
            padding: "clamp(12px, 3vw, 16px)",
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, fontSize: "clamp(20px, 5vw, 28px)", fontWeight: 700, color: "var(--primary)" }}>
            {totalStudents}
          </p>
          <p style={{ margin: "4px 0 0 0", fontSize: "clamp(11px, 2.8vw, 13px)", color: "var(--text-secondary)" }}>
            {t("coachTotalStudents")}
          </p>
        </div>
        <div
          className="card"
          style={{
            padding: "clamp(12px, 3vw, 16px)",
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, fontSize: "clamp(20px, 5vw, 28px)", fontWeight: 700, color: "var(--primary)" }}>
            {lessonsThisWeek}
          </p>
          <p style={{ margin: "4px 0 0 0", fontSize: "clamp(11px, 2.8vw, 13px)", color: "var(--text-secondary)" }}>
            {t("coachLessonsThisWeek")}
          </p>
        </div>
        <div
          className="card"
          style={{
            padding: "clamp(12px, 3vw, 16px)",
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, fontSize: "clamp(20px, 5vw, 28px)", fontWeight: 700, color: "var(--primary)" }}>
            {totalPresencesToday}
          </p>
          <p style={{ margin: "4px 0 0 0", fontSize: "clamp(11px, 2.8vw, 13px)", color: "var(--text-secondary)" }}>
            {t("coachPresencesToday")}
          </p>
        </div>
      </section>

      {/* Próxima aula */}
      <section className="card" style={{ padding: "clamp(18px, 4.5vw, 24px)" }}>
        <h2 style={{ margin: "0 0 clamp(8px, 2vw, 12px) 0", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
          {t("nextClass")}
        </h2>
        {nextLesson ? (
          <>
            <p style={{ margin: "0 0 8px 0", fontSize: "clamp(18px, 4.5vw, 22px)", fontWeight: 600, color: "var(--text-primary)" }}>
              {MODALITY_LABELS[nextLesson.modality] ?? nextLesson.modality}
            </p>
            <p style={{ margin: "0 0 clamp(12px, 3vw, 16px) 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
              {formatLessonDate(nextLesson.date)} · {nextLesson.startTime}–{nextLesson.endTime}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "clamp(8px, 2vw, 12px)" }}>
              <Link
                href={`/coach/aula?lesson=${nextLesson.id}`}
                className="btn btn-primary"
                style={{ textDecoration: "none" }}
              >
                {t("enterClass")}
              </Link>
              <Link
                href={`/coach/aula/qr?lesson=${nextLesson.id}`}
                className="btn btn-secondary"
                style={{ textDecoration: "none" }}
              >
                {t("viewQrCode")}
              </Link>
            </div>
          </>
        ) : (
          <>
            <p style={{ margin: "0 0 clamp(12px, 3vw, 16px) 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              {t("noClassScheduled")}
            </p>
            <Link href="/coach/aula" className="btn btn-primary" style={{ textDecoration: "none" }}>
              {t("enterClass")}
            </Link>
          </>
        )}
      </section>

      {/* Presenças do dia */}
      {todayPresences.length > 0 && (
        <section className="card" style={{ padding: "clamp(18px, 4.5vw, 24px)" }}>
          <h2 style={{ margin: "0 0 clamp(12px, 3vw, 16px) 0", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
            {t("coachTodayPresences")}
          </h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(8px, 2vw, 12px)" }}>
            {todayPresences.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/coach/aula?lesson=${l.id}`}
                  style={{
                    display: "block",
                    padding: "clamp(10px, 2.5vw, 14px) clamp(12px, 3vw, 16px)",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--bg)",
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    color: "var(--text-primary)",
                    textDecoration: "none",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{MODALITY_LABELS[l.modality] ?? l.modality}</span>
                    <span style={{ color: "var(--text-secondary)", fontSize: "clamp(13px, 3.2vw, 15px)" }}>
                      {l.startTime}–{l.endTime}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: "clamp(12px, 3vw, 14px)", color: "var(--text-secondary)" }}>
                    <span style={{ color: "var(--success)" }}>{l.confirmed} {t("coachConfirmed")}</span>
                    <span>{l.pending} {t("coachPending")}</span>
                    {l.absent > 0 && <span style={{ color: "var(--danger)" }}>{l.absent} {t("coachAbsent")}</span>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {todayPresences.length === 0 && (
        <section className="card" style={{ padding: "clamp(18px, 4.5vw, 24px)" }}>
          <h2 style={{ margin: "0 0 clamp(8px, 2vw, 12px) 0", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
            {t("coachTodayPresences")}
          </h2>
          <p style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
            {t("coachPresencesTodayEmpty")}
          </p>
        </section>
      )}

      {alunosNaoAvaliados.length > 0 && (
        <section className="card" style={{ padding: "clamp(18px, 4.5vw, 24px)" }}>
          <h2 style={{ margin: "0 0 clamp(8px, 2vw, 12px) 0", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
            {t("coachNotEvaluatedTitle")} ({DAYS_NAO_AVALIADOS} {locale === "pt" ? "dias" : "days"})
          </h2>
          <p style={{ margin: "0 0 clamp(12px, 3vw, 16px) 0", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
            {t("coachNotEvaluatedHint")}
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(6px, 1.5vw, 8px)" }}>
            {alunosNaoAvaliados.map((a) => (
              <li key={a.studentId}>
                <Link
                  href={`/coach/alunos/${a.studentId}`}
                  style={{
                    display: "block",
                    padding: "clamp(8px, 2vw, 10px) clamp(12px, 3vw, 14px)",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--bg)",
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    color: "var(--text-primary)",
                    textDecoration: "none",
                  }}
                >
                  {a.name || "Aluno"}
                </Link>
              </li>
            ))}
          </ul>
          <p style={{ margin: "clamp(12px, 3vw, 16px) 0 0 0", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
            <Link href="/coach/aula" style={{ color: "var(--primary)", textDecoration: "none" }}>
              {t("coachGoToPresences")}
            </Link>
          </p>
        </section>
      )}

      <section className="card" style={{ padding: "clamp(18px, 4.5vw, 24px)" }}>
        <h2 style={{ margin: "0 0 clamp(12px, 3vw, 16px) 0", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
          {t("quickAccess")}
        </h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(8px, 2vw, 12px)" }}>
          {dbUser?.role === "ADMIN" && (
            <li>
              <Link href="/coach/agenda" style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--primary)", textDecoration: "none" }}>
                {t("viewAgenda")}
              </Link>
            </li>
          )}
          <li>
            <Link href="/coach/atletas" style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--primary)", textDecoration: "none" }}>
              {t("athletesUnderCoaching")}
            </Link>
          </li>
          <li>
            <Link href="/coach/alunos" style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--primary)", textDecoration: "none" }}>
              {t("navStudents")}
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
