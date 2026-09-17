import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import { redirect } from "next/navigation";

const LEVEL_LABEL: Record<string, string> = {
  INICIANTE: "Iniciante",
  INTERMEDIARIO: "Intermediário",
  AVANCADO: "Avançado",
};

type SearchParams = Promise<{ modality?: string }>;

export default async function AdminAtletasPage({ searchParams }: { searchParams: SearchParams }) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const selectedModality = params.modality?.trim() || null;

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  /** A lista mostra só alunos marcados como "atleta de competição" — não todo mundo com perfil de avaliação. */
  const { data: flaggedStudents } = await supabase
    .from("Student")
    .select("id, userId")
    .eq("competitionAthlete", true);
  const flagged = flaggedStudents ?? [];
  const studentIds = flagged.map((s) => s.id);

  const { data: athletes } =
    studentIds.length > 0
      ? await supabase.from("Athlete").select("id, studentId, level, mainCoachId").in("studentId", studentIds)
      : { data: [] };
  const athleteByStudentId = new Map((athletes ?? []).map((a) => [a.studentId, a]));
  const coachIds = [...new Set((athletes ?? []).map((a) => a.mainCoachId).filter(Boolean))] as string[];

  const { data: students } =
    studentIds.length > 0 ? await supabase.from("Student").select("id, userId").in("id", studentIds) : { data: [] };
  const userIds = [...new Set((students ?? []).map((s) => s.userId))];
  const { data: users } =
    userIds.length > 0 ? await supabase.from("User").select("id, name, email").in("id", userIds) : { data: [] };
  const userById = new Map((users ?? []).map((u) => [u.id, u]));
  const studentToUser = new Map((students ?? []).map((s) => [s.id, userById.get(s.userId)]));

  const { data: coaches } =
    coachIds.length > 0 ? await supabase.from("Coach").select("id, userId").in("id", coachIds) : { data: [] };
  const coachUserIds = [...new Set((coaches ?? []).map((c) => c.userId))];
  const { data: coachUsers } =
    coachUserIds.length > 0 ? await supabase.from("User").select("id, name").in("id", coachUserIds) : { data: [] };
  const coachNameById = new Map((coachUsers ?? []).map((u) => [u.id, u.name]));
  const coachIdToName = new Map((coaches ?? []).map((c) => [c.id, coachNameById.get(c.userId) ?? c.userId]));

  const { data: attendances } =
    studentIds.length > 0
      ? await supabase.from("Attendance").select("studentId, lessonId").in("studentId", studentIds).eq("status", "CONFIRMED")
      : { data: [] };
  const lessonIds = [...new Set((attendances ?? []).map((a) => a.lessonId as string))];
  const { data: lessons } = lessonIds.length
    ? await supabase.from("Lesson").select("id, modality").in("id", lessonIds)
    : { data: [] };
  const modalityByLessonId = new Map((lessons ?? []).map((l) => [l.id as string, l.modality as string]));

  /** Modalidades praticadas por cada atleta, derivadas das aulas frequentadas. */
  const modalitiesByStudentId = new Map<string, Set<string>>();
  for (const a of attendances ?? []) {
    const modality = modalityByLessonId.get(a.lessonId as string);
    if (!modality) continue;
    const studentId = a.studentId as string;
    const set = modalitiesByStudentId.get(studentId) ?? new Set<string>();
    set.add(modality);
    modalitiesByStudentId.set(studentId, set);
  }

  type Row = {
    key: string;
    studentId: string;
    level: string | null;
    coachName: string | null;
    modalities: string[];
    href: string;
  };

  let rows: Row[] = flagged.map((s) => {
    const athlete = athleteByStudentId.get(s.id);
    return {
      key: s.id,
      studentId: s.id,
      level: athlete?.level ?? null,
      coachName: athlete?.mainCoachId ? coachIdToName.get(athlete.mainCoachId) ?? null : null,
      modalities: [...(modalitiesByStudentId.get(s.id) ?? [])].sort(),
      href: athlete ? `/coach/atletas/${athlete.id}` : `/admin/alunos/${s.id}`,
    };
  });

  const availableModalities = [...new Set(rows.flatMap((r) => r.modalities))].sort();

  if (selectedModality) {
    rows = rows.filter((r) => r.modalities.includes(selectedModality));
  }

  return (
    <div style={{ maxWidth: "min(700px, 100%)" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "clamp(12px, 3vw, 16px)",
          marginBottom: "clamp(20px, 5vw, 24px)",
        }}
      >
        <Link
          href="/admin"
          style={{
            color: "var(--text-secondary)",
            fontSize: "clamp(15px, 3.8vw, 17px)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          ← Voltar
        </Link>
        <h1 style={{ margin: 0, fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Atletas
        </h1>
        <Link
          href="/admin/atletas/novo"
          className="btn btn-primary"
          style={{ marginLeft: "auto", textDecoration: "none" }}
        >
          Novo atleta
        </Link>
      </div>

      {availableModalities.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: "clamp(16px, 4vw, 20px)" }}>
          <Link
            href="/admin/atletas"
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
              href={`/admin/atletas?modality=${encodeURIComponent(m)}`}
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
          {selectedModality
            ? "Nenhum atleta de competição pratica esta modalidade."
            : "Ainda não há atletas de competição. Marca um aluno como atleta de competição no perfil dele, ou adiciona um em \"Novo atleta\"."}
        </p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: "clamp(10px, 2.5vw, 12px)",
          }}
        >
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
                    {row.level && (
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
                    )}
                    {row.coachName && (
                      <span style={{ fontSize: "clamp(12px, 3vw, 14px)", color: "var(--text-secondary)" }}>
                        Coach: {row.coachName}
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
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
