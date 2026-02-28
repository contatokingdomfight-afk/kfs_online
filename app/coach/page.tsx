import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentCoachId } from "@/lib/auth/get-current-coach";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { MODALITY_LABELS, formatLessonDate } from "@/lib/lesson-utils";

const DAYS_NAO_AVALIADOS = 20;

export default async function CoachHomePage() {
  const dbUser = await getCurrentDbUser();
  const coachId = await getCurrentCoachId();
  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale as "pt" | "en");
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - DAYS_NAO_AVALIADOS);
  const sinceIso = sinceDate.toISOString().slice(0, 10);

  let query = supabase
    .from("Lesson")
    .select("id, modality, date, startTime, endTime")
    .gte("date", today)
    .order("date", { ascending: true })
    .order("startTime", { ascending: true })
    .limit(5);

  if (coachId) {
    query = query.eq("coachId", coachId);
  }

  const { data: lessons } = await query;
  const nextLesson = lessons?.[0] ?? null;

  type AlunoNaoAvaliado = { studentId: string; name: string | null };
  let alunosNaoAvaliados: AlunoNaoAvaliado[] = [];
  if (coachId) {
    const { data: lessonsLast20 } = await supabase
      .from("Lesson")
      .select("id")
      .eq("coachId", coachId)
      .gte("date", sinceIso);
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

      {alunosNaoAvaliados.length > 0 && (
        <section className="card" style={{ padding: "clamp(18px, 4.5vw, 24px)" }}>
          <h2 style={{ margin: "0 0 clamp(8px, 2vw, 12px) 0", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
            Alunos sem avaliação nos últimos {DAYS_NAO_AVALIADOS} dias
          </h2>
          <p style={{ margin: "0 0 clamp(12px, 3vw, 16px) 0", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
            Estes alunos estiveram nas tuas aulas mas ainda não foram avaliados por ti neste período.
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
              Ir para presenças na aula →
            </Link>
          </p>
        </section>
      )}

      <section className="card" style={{ padding: "clamp(18px, 4.5vw, 24px)" }}>
        <h2 style={{ margin: "0 0 clamp(12px, 3vw, 16px) 0", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
          {t("quickAccess")}
        </h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(8px, 2vw, 12px)" }}>
          <li>
            <Link href="/coach/agenda" style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--primary)", textDecoration: "none" }}>
              {t("viewAgenda")}
            </Link>
          </li>
          <li>
            <Link href="/coach/atletas" style={{ fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--primary)", textDecoration: "none" }}>
              {t("athletesUnderCoaching")}
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
