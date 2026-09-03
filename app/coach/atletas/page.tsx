import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentCoachId } from "@/lib/auth/get-current-coach";
import { getCoachSchoolIds } from "@/lib/coach-schools";

const LEVEL_LABEL: Record<string, string> = {
  INICIANTE: "Iniciante",
  INTERMEDIARIO: "Intermediário",
  AVANCADO: "Avançado",
};

export default async function CoachAtletasPage() {
  const coachId = await getCurrentCoachId();
  const supabase = await createClient();
  const userReadClient = getAdminClientOrNull().client ?? supabase;

  const { data: allAthletes } = await supabase.from("Athlete").select("id, studentId, level, mainCoachId").order("id");
  const list = coachId ? (allAthletes ?? []).filter((a) => a.mainCoachId === coachId) : allAthletes ?? [];
  /** Exclusão de flagOnly usa TODOS os atletas (não só os deste coach) — um aluno já acompanhado por outro coach não deve reaparecer sem o nível. */
  const athleteStudentIds = new Set((allAthletes ?? []).map((a) => a.studentId));

  const { data: flaggedStudents } = await userReadClient
    .from("Student")
    .select("id, userId, schoolId")
    .eq("competitionAthlete", true);
  let flaggedInScope = flaggedStudents ?? [];
  if (coachId) {
    const schoolIds = new Set(await getCoachSchoolIds(userReadClient, coachId));
    flaggedInScope = flaggedInScope.filter((s) => s.schoolId && schoolIds.has(s.schoolId));
  }
  const flagOnly = flaggedInScope.filter((s) => !athleteStudentIds.has(s.id));

  const studentIds = [...new Set([...list.map((a) => a.studentId), ...flagOnly.map((s) => s.id)])];
  const { data: students } =
    studentIds.length > 0
      ? await userReadClient.from("Student").select("id, userId").in("id", studentIds)
      : { data: [] };
  const userIds = [...new Set((students ?? []).map((s) => s.userId))];
  const { data: users } =
    userIds.length > 0
      ? await userReadClient.from("User").select("id, name, email").in("id", userIds)
      : { data: [] };
  const userById = new Map((users ?? []).map((u) => [u.id, u]));
  const studentToUser = new Map((students ?? []).map((s) => [s.id, userById.get(s.userId)]));

  type Row =
    | { kind: "athlete"; key: string; studentId: string; level: string; href: string }
    | { kind: "flag"; key: string; studentId: string; href: string };

  const rows: Row[] = [
    ...list.map((a): Row => ({
      kind: "athlete",
      key: `athlete-${a.id}`,
      studentId: a.studentId,
      level: a.level,
      href: `/coach/atletas/${a.id}`,
    })),
    ...flagOnly.map((s): Row => ({
      kind: "flag",
      key: `flag-${s.id}`,
      studentId: s.id,
      href: `/coach/alunos/${s.id}`,
    })),
  ];

  return (
    <div style={{ maxWidth: "min(600px, 100%)" }}>
      <div style={{ marginBottom: "clamp(20px, 5vw, 24px)" }}>
        <Link
          href="/coach"
          style={{
            color: "var(--text-secondary)",
            fontSize: "clamp(15px, 3.8vw, 17px)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          ← Voltar
        </Link>
      </div>
      <h1 style={{ margin: "0 0 clamp(16px, 4vw, 20px) 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
        Atletas
      </h1>
      {!coachId && (
        <p style={{ margin: "0 0 clamp(16px, 4vw, 20px) 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
          A vista como admin mostra todos os atletas. Como coach verias apenas os teus.
        </p>
      )}
      {rows.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)" }}>
          Nenhum atleta em acompanhamento.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(10px, 2.5vw, 12px)" }}>
          {rows.map((row) => {
            const u = studentToUser.get(row.studentId);
            return (
              <li key={row.key}>
                <Link
                  href={row.href}
                  className="card"
                  style={{
                    display: "block",
                    padding: "clamp(14px, 3.5vw, 18px)",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)" }}>
                      {u?.name || u?.email || "—"}
                    </span>
                    {row.kind === "athlete" ? (
                      <span
                        style={{
                          fontSize: "clamp(12px, 3vw, 14px)",
                          padding: "2px 8px",
                          borderRadius: "var(--radius-md)",
                          backgroundColor: "var(--bg)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {LEVEL_LABEL[row.level] ?? row.level}
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: "clamp(12px, 3vw, 14px)",
                          padding: "2px 8px",
                          borderRadius: "var(--radius-md)",
                          backgroundColor: "#7c2d12",
                          color: "#fff",
                        }}
                      >
                        Atleta de competição
                      </span>
                    )}
                    <span style={{ marginLeft: "auto", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--primary)" }}>
                      Ver perfil →
                    </span>
                  </div>
                  {u?.email && (
                    <p style={{ margin: "4px 0 0 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                      {u.email}
                    </p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
