import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCoachId } from "@/lib/auth/get-current-coach";

const LEVEL_LABEL: Record<string, string> = {
  INICIANTE: "Iniciante",
  INTERMEDIARIO: "Intermediário",
  AVANCADO: "Avançado",
};

export default async function CoachAtletasPage() {
  const coachId = await getCurrentCoachId();
  const supabase = await createClient();

  let query = supabase
    .from("Athlete")
    .select("id, studentId, level, mainCoachId")
    .order("id");

  if (coachId) {
    query = query.eq("mainCoachId", coachId);
  }

  const { data: athletes } = await query;
  const list = athletes ?? [];

  const studentIds = list.map((a) => a.studentId);
  const { data: students } =
    studentIds.length > 0
      ? await supabase.from("Student").select("id, userId").in("id", studentIds)
      : { data: [] };
  const userIds = [...new Set((students ?? []).map((s) => s.userId))];
  const { data: users } =
    userIds.length > 0 ? await supabase.from("User").select("id, name, email").in("id", userIds) : { data: [] };
  const userById = new Map((users ?? []).map((u) => [u.id, u]));
  const studentToUser = new Map((students ?? []).map((s) => [s.id, userById.get(s.userId)]));

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
      {list.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)" }}>
          Nenhum atleta em acompanhamento.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(10px, 2.5vw, 12px)" }}>
          {list.map((a) => {
            const u = studentToUser.get(a.studentId);
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
