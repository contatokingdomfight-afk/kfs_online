import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentCoachId } from "@/lib/auth/get-current-coach";
import { getCoachSchoolIds } from "@/lib/coach-schools";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import { CoachAlunoEvaluateButton } from "@/app/coach/alunos/[id]/_components/CoachAlunoEvaluateButton";

/** A partir de quantos dias sem avaliação um aluno entra nesta lista (nunca avaliado entra sempre). */
const STALE_DAYS_THRESHOLD = 30;

type Row = {
  studentId: string;
  name: string;
  email: string;
  daysSinceLastEval: number | null;
  modalities: string[];
};

type SearchParams = Promise<{ modality?: string }>;

export default async function CoachCoberturaAvaliacoesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const coachId = await getCurrentCoachId();
  const result = getAdminClientOrNull();
  if (!result.client) return null;
  const supabase = result.client;
  const params = await searchParams;
  const selectedModality = params.modality?.trim() || null;

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

  const [{ data: users }, { data: athletes }, { data: attendances }] = await Promise.all([
    userIds.length ? supabase.from("User").select("id, name, email").in("id", userIds) : Promise.resolve({ data: [] }),
    studentIds.length
      ? supabase.from("Athlete").select("id, studentId").in("studentId", studentIds)
      : Promise.resolve({ data: [] }),
    studentIds.length
      ? supabase.from("Attendance").select("studentId, lessonId").in("studentId", studentIds).eq("status", "CONFIRMED")
      : Promise.resolve({ data: [] }),
  ]);
  const userById = new Map((users ?? []).map((u) => [u.id, u]));
  const athleteByStudentId = new Map((athletes ?? []).map((a) => [a.studentId, a.id as string]));
  const athleteIds = [...athleteByStudentId.values()];

  const lessonIds = [...new Set((attendances ?? []).map((a) => a.lessonId as string))];
  const { data: lessons } = lessonIds.length
    ? await supabase.from("Lesson").select("id, modality").in("id", lessonIds)
    : { data: [] };
  const modalityByLessonId = new Map((lessons ?? []).map((l) => [l.id as string, l.modality as string]));

  /** Modalidades praticadas por cada aluno, derivadas das aulas frequentadas (não das avaliações — assim funciona mesmo para quem nunca foi avaliado). */
  const modalitiesByStudentId = new Map<string, Set<string>>();
  for (const a of attendances ?? []) {
    const modality = modalityByLessonId.get(a.lessonId as string);
    if (!modality) continue;
    const studentId = a.studentId as string;
    const set = modalitiesByStudentId.get(studentId) ?? new Set<string>();
    set.add(modality);
    modalitiesByStudentId.set(studentId, set);
  }

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
  let rows: Row[] = students
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
        modalities: [...(modalitiesByStudentId.get(s.id) ?? [])].sort(),
      };
    })
    .filter((r) => r.daysSinceLastEval === null || r.daysSinceLastEval >= STALE_DAYS_THRESHOLD)
    .sort((a, b) => {
      if (a.daysSinceLastEval === null && b.daysSinceLastEval === null) return 0;
      if (a.daysSinceLastEval === null) return -1;
      if (b.daysSinceLastEval === null) return 1;
      return b.daysSinceLastEval - a.daysSinceLastEval;
    });

  const availableModalities = [...new Set(rows.flatMap((r) => r.modalities))].sort();

  if (selectedModality) {
    rows = rows.filter((r) => r.modalities.includes(selectedModality));
  }

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
      {availableModalities.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: "clamp(16px, 4vw, 20px)" }}>
          <Link
            href="/coach/cobertura-avaliacoes"
            style={{
              fontSize: "clamp(13px, 3.2vw, 14px)",
              padding: "4px 12px",
              borderRadius: "var(--radius-md)",
              textDecoration: "none",
              fontWeight: 500,
              backgroundColor: !selectedModality ? "var(--primary)" : "var(--bg)",
              color: !selectedModality ? "#fff" : "var(--text-secondary)",
            }}
          >
            Todas
          </Link>
          {availableModalities.map((m) => (
            <Link
              key={m}
              href={`/coach/cobertura-avaliacoes?modality=${encodeURIComponent(m)}`}
              style={{
                fontSize: "clamp(13px, 3.2vw, 14px)",
                padding: "4px 12px",
                borderRadius: "var(--radius-md)",
                textDecoration: "none",
                fontWeight: 500,
                backgroundColor: selectedModality === m ? "var(--primary)" : "var(--bg)",
                color: selectedModality === m ? "#fff" : "var(--text-secondary)",
              }}
            >
              {MODALITY_LABELS[m] || m}
            </Link>
          ))}
        </div>
      )}
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
              {row.modalities.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {row.modalities.map((m) => (
                    <span
                      key={m}
                      style={{
                        fontSize: "clamp(11px, 2.8vw, 13px)",
                        padding: "2px 8px",
                        borderRadius: "var(--radius-md)",
                        backgroundColor: "var(--bg-secondary)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {MODALITY_LABELS[m] || m}
                    </span>
                  ))}
                </div>
              )}
              <CoachAlunoEvaluateButton studentId={row.studentId} successRedirectHref="/coach/cobertura-avaliacoes" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
