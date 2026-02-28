import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";

const STATUS_LABEL: Record<string, string> = {
  ATIVO: "Ativo",
  INATIVO: "Inativo",
  EXPERIMENTAL: "Experimental",
};

type SearchParams = Promise<{ status?: string; modality?: string }>;

export default async function AdminAlunosPage({ searchParams }: { searchParams: SearchParams }) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const filterStatus = params.status ?? "all";
  const filterModality = params.modality ?? "all";

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const { data: studentsData } = await supabase
    .from("Student")
    .select("id, userId, status, primaryModality, createdAt")
    .order("createdAt", { ascending: false });

  const students = studentsData ?? [];
  let filtered = students;
  if (filterStatus !== "all") {
    filtered = filtered.filter((s) => s.status === filterStatus);
  }
  if (filterModality !== "all") {
    filtered = filtered.filter(
      (s) => (s as { primaryModality?: string | null }).primaryModality === filterModality
    );
  }

  const userIds = [...new Set(filtered.map((s) => s.userId))];
  const { data: usersData } = await supabase
    .from("User")
    .select("id, name, email")
    .in("id", userIds);

  const userById = new Map((usersData ?? []).map((u) => [u.id, u]));

  const { data: modalitiesList } = await supabase.from("ModalityRef").select("code, name").order("sortOrder", { ascending: true });
  const modalitiesForFilter = modalitiesList ?? [];

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
          Alunos
        </h1>
        <Link
          href="/admin/alunos/novo"
          className="btn btn-primary"
          style={{ marginLeft: "auto", textDecoration: "none" }}
        >
          Novo aluno
        </Link>
      </div>

      <div style={{ marginBottom: "clamp(16px, 4vw, 20px)" }}>
        <p style={{ margin: "0 0 8px 0", fontSize: "clamp(13px, 3.2vw, 15px)", fontWeight: 600, color: "var(--text-secondary)" }}>
          Status
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <Link
            href={filterModality !== "all" ? `/admin/alunos?modality=${filterModality}` : "/admin/alunos"}
            className="btn"
            style={{
              textDecoration: "none",
              backgroundColor: filterStatus === "all" ? "var(--primary)" : "var(--bg-secondary)",
              color: filterStatus === "all" ? "#fff" : "var(--text-primary)",
            }}
          >
            Todos
          </Link>
          {(["ATIVO", "INATIVO", "EXPERIMENTAL"] as const).map((s) => (
            <Link
              key={s}
              href={`/admin/alunos?status=${s}${filterModality !== "all" ? `&modality=${filterModality}` : ""}`}
              className="btn"
              style={{
                textDecoration: "none",
                backgroundColor: filterStatus === s ? "var(--primary)" : "var(--bg-secondary)",
                color: filterStatus === s ? "#fff" : "var(--text-primary)",
              }}
            >
              {STATUS_LABEL[s]}
            </Link>
          ))}
        </div>
        <p style={{ margin: "0 0 8px 0", fontSize: "clamp(13px, 3.2vw, 15px)", fontWeight: 600, color: "var(--text-secondary)" }}>
          Modalidade
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link
            href={filterStatus !== "all" ? `/admin/alunos?status=${filterStatus}` : "/admin/alunos"}
            className="btn"
            style={{
              textDecoration: "none",
              backgroundColor: filterModality === "all" ? "var(--primary)" : "var(--bg-secondary)",
              color: filterModality === "all" ? "#fff" : "var(--text-primary)",
            }}
          >
            Todas
          </Link>
          {modalitiesForFilter.map((m) => (
            <Link
              key={m.code}
              href={`/admin/alunos?modality=${m.code}${filterStatus !== "all" ? `&status=${filterStatus}` : ""}`}
              className="btn"
              style={{
                textDecoration: "none",
                backgroundColor: filterModality === m.code ? "var(--primary)" : "var(--bg-secondary)",
                color: filterModality === m.code ? "#fff" : "var(--text-primary)",
              }}
            >
              {m.name}
            </Link>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)" }}>
          {students.length === 0
            ? "Ainda não há alunos cadastrados."
            : "Nenhum aluno com este filtro."}
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(10px, 2.5vw, 12px)" }}>
          {filtered.map((s) => {
            const u = userById.get(s.userId);
            const primMod = (s as { primaryModality?: string | null }).primaryModality;
            return (
              <li key={s.id}>
                <Link
                  href={`/admin/alunos/${s.id}`}
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
                      {u?.name || "—"}
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
                      {STATUS_LABEL[s.status] ?? s.status}
                    </span>
                    {primMod && (
                      <span
                        style={{
                          fontSize: "clamp(12px, 3vw, 14px)",
                          padding: "2px 8px",
                          borderRadius: "var(--radius-md)",
                          backgroundColor: "var(--surface)",
                          color: "var(--text-primary)",
                        }}
                      >
                        {modalitiesForFilter.find((x) => x.code === primMod)?.name ?? primMod}
                      </span>
                    )}
                  </div>
                  <p style={{ margin: "4px 0 0 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                    {u?.email ?? "—"}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
