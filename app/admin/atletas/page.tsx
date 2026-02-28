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
  const studentIds = list.map((a) => a.studentId);
  const coachIds = [...new Set(list.map((a) => a.mainCoachId).filter(Boolean))] as string[];

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

      {list.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)" }}>
          Ainda não há atletas. Um atleta é um aluno em acompanhamento; adiciona um em &quot;Novo atleta&quot;.
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
          {list.map((a) => {
            const u = studentToUser.get(a.studentId);
            const coachName = a.mainCoachId ? coachIdToName.get(a.mainCoachId) : null;
            return (
              <li key={a.id}>
                <Link
                  href={`/coach/atletas/${a.id}`}
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
                        backgroundColor: "var(--bg)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {LEVEL_LABEL[a.level] ?? a.level}
                    </span>
                    {coachName && (
                      <span style={{ fontSize: "clamp(12px, 3vw, 14px)", color: "var(--text-secondary)" }}>
                        Coach: {coachName}
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
