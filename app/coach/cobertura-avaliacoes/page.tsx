import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentCoachId } from "@/lib/auth/get-current-coach";
import { getCoachSchoolIds } from "@/lib/coach-schools";
import { CoachAlunoEvaluateButton } from "@/app/coach/alunos/[id]/_components/CoachAlunoEvaluateButton";

/** A partir de quantos dias sem avaliação um aluno entra nesta lista (nunca avaliado entra sempre). */
const STALE_DAYS_THRESHOLD = 30;

type Row = {
  studentId: string;
  name: string;
  email: string;
  daysSinceLastEval: number | null;
};

export default async function CoachCoberturaAvaliacoesPage() {
  const coachId = await getCurrentCoachId();
  const result = getAdminClientOrNull();
  if (!result.client) return null;
  const supabase = result.client;

  const { data: studentsData } = await supabase
    .from("Student")
    .select("id, userId, schoolId, createdAt")
    .eq("status", "ATIVO");
  let students = studentsData ?? [];

  if (coachId) {
    const schoolIds = new Set(await getCoachSchoolIds(supabase, coachId));
    students = students.filter((s) => s.schoolId && schoolIds.has(s.schoolId));
  }

  const studentIds = students.map((s) => s.id);
  const userIds = [...new Set(students.map((s) => s.userId))];

  const [{ data: users }, { data: athletes }] = await Promise.all([
    userIds.length ? supabase.from("User").select("id, name, email").in("id", userIds) : Promise.resolve({ data: [] }),
    studentIds.length
      ? supabase.from("Athlete").select("id, studentId").in("studentId", studentIds)
      : Promise.resolve({ data: [] }),
  ]);
  const userById = new Map((users ?? []).map((u) => [u.id, u]));
  const athleteByStudentId = new Map((athletes ?? []).map((a) => [a.studentId, a.id as string]));
  const athleteIds = [...athleteByStudentId.values()];

  const { data: evaluations } = athleteIds.length
    ? await supabase
        .from("AthleteEvaluation")
        .select("athleteId, created_at")
        .in("athleteId", athleteIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  /** Só a mais recente por atleta — a query já vem ordenada desc, guarda a 1.ª vez que vê cada id. */
  const lastEvalAtByAthleteId = new Map<string, string>();
  for (const e of evaluations ?? []) {
    const aid = e.athleteId as string;
    if (!lastEvalAtByAthleteId.has(aid)) lastEvalAtByAthleteId.set(aid, e.created_at as string);
  }

  const today = Date.now();
  const rows: Row[] = students
    .map((s) => {
      const user = userById.get(s.userId);
      const athleteId = athleteByStudentId.get(s.id);
      const lastEvalAt = athleteId ? lastEvalAtByAthleteId.get(athleteId) : undefined;
      const daysSinceLastEval = lastEvalAt
        ? Math.floor((today - new Date(lastEvalAt).getTime()) / (1000 * 60 * 60 * 24))
        : null;
      return {
        studentId: s.id,
        name: user?.name?.trim() || user?.email || "—",
        email: user?.email ?? "",
        daysSinceLastEval,
      };
    })
    .filter((r) => r.daysSinceLastEval === null || r.daysSinceLastEval >= STALE_DAYS_THRESHOLD)
    .sort((a, b) => {
      if (a.daysSinceLastEval === null && b.daysSinceLastEval === null) return 0;
      if (a.daysSinceLastEval === null) return -1;
      if (b.daysSinceLastEval === null) return 1;
      return b.daysSinceLastEval - a.daysSinceLastEval;
    });

  return (
    <div style={{ maxWidth: "min(640px, 100%)" }}>
      <div style={{ marginBottom: "clamp(20px, 5vw, 24px)" }}>
        <Link
          href="/coach"
          style={{ color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)", textDecoration: "none", fontWeight: 500 }}
        >
          ← Voltar
        </Link>
      </div>
      <h1 style={{ margin: "0 0 8px 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
        Cobertura de avaliações
      </h1>
      <p style={{ margin: "0 0 clamp(16px, 4vw, 20px) 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
        Alunos que nunca foram avaliados, ou sem avaliação há {STALE_DAYS_THRESHOLD}+ dias.
      </p>
      {rows.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)" }}>
          Tudo em dia — sem alunos por avaliar.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(10px, 2.5vw, 12px)" }}>
          {rows.map((row) => (
            <li key={row.studentId} className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)" }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                <Link
                  href={`/coach/alunos/${row.studentId}`}
                  style={{ fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)", textDecoration: "none" }}
                >
                  {row.name}
                </Link>
                <span
                  style={{
                    fontSize: "clamp(12px, 3vw, 14px)",
                    padding: "2px 8px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: row.daysSinceLastEval === null ? "#7c2d12" : "var(--bg)",
                    color: row.daysSinceLastEval === null ? "#fff" : "var(--text-secondary)",
                  }}
                >
                  {row.daysSinceLastEval === null ? "Nunca avaliado" : `Há ${row.daysSinceLastEval} dias`}
                </span>
              </div>
              {row.email && (
                <p style={{ margin: "4px 0 0 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                  {row.email}
                </p>
              )}
              <CoachAlunoEvaluateButton studentId={row.studentId} successRedirectHref="/coach/cobertura-avaliacoes" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
