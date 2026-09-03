import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";

const LEVEL_LABEL: Record<string, string> = {
  INICIANTE: "Iniciante",
  INTERMEDIARIO: "Intermediário",
  AVANCADO: "Avançado",
};

export default async function AdminAtletasPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const { data: athletes } = await supabase
    .from("Athlete")
    .select("id, studentId, level, mainCoachId")
    .order("id");

  const list = athletes ?? [];
  const athleteStudentIds = new Set(list.map((a) => a.studentId));
  const coachIds = [...new Set(list.map((a) => a.mainCoachId).filter(Boolean))] as string[];

  const { data: flaggedStudents } = await supabase
    .from("Student")
    .select("id, userId")
    .eq("competitionAthlete", true);
  const flagOnly = (flaggedStudents ?? []).filter((s) => !athleteStudentIds.has(s.id));

  const studentIds = [...new Set([...list.map((a) => a.studentId), ...flagOnly.map((s) => s.id)])];

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
  const coachIdToUserId = new Map((coaches ?? []).map((c) => [c.id, c.userId]));
  const coachIdToName = new Map(
    (coaches ?? []).map((c) => [c.id, coachNameById.get(c.userId) ?? c.userId])
  );

  type Row =
    | { kind: "athlete"; key: string; studentId: string; level: string; coachName: string | null; href: string }
    | { kind: "flag"; key: string; studentId: string; href: string };

  const rows: Row[] = [
    ...list.map((a): Row => ({
      kind: "athlete",
      key: `athlete-${a.id}`,
      studentId: a.studentId,
      level: a.level,
      coachName: a.mainCoachId ? coachIdToName.get(a.mainCoachId) ?? null : null,
      href: `/coach/atletas/${a.id}`,
    })),
    ...flagOnly.map((s): Row => ({
      kind: "flag",
      key: `flag-${s.id}`,
      studentId: s.id,
      href: `/admin/alunos/${s.id}`,
    })),
  ];

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

      {rows.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)" }}>
          Ainda não há atletas. Um atleta é um aluno em acompanhamento; adiciona um em &quot;Novo atleta&quot;, ou
          marca um aluno como atleta de competição no perfil dele.
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
                    {row.kind === "athlete" && row.coachName && (
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
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
