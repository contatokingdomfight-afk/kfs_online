import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { AdicionarModalidadeForm } from "./AdicionarModalidadeForm";
import { DeleteModalityButton } from "./DeleteModalityButton";

export default async function AdminModalidadesPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const { data: modalities } = await supabase
    .from("ModalityRef")
    .select("id, code, name, sortOrder")
    .order("sortOrder", { ascending: true });

  const list = modalities ?? [];

  return (
    <div style={{ maxWidth: "min(560px, 100%)" }}>
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
          Modalidades
        </h1>
      </div>

      <p style={{ margin: "0 0 clamp(16px, 4vw, 20px) 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
        As modalidades disponíveis na plataforma (aulas, avaliações, filtros de alunos). Podes adicionar novas para outras disciplinas ou franquias.
      </p>

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(10px, 2.5vw, 12px)" }}>
        {list.map((m) => (
          <li
            key={m.id}
            className="card"
            style={{ padding: "clamp(14px, 3.5vw, 18px)", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)" }}>
                {m.name}
              </span>
              <span
                style={{
                  fontSize: "clamp(12px, 3vw, 14px)",
                  padding: "2px 8px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--bg)",
                  color: "var(--text-secondary)",
                  fontFamily: "monospace",
                }}
              >
                {m.code}
              </span>
            </div>
            <DeleteModalityButton code={m.code} />
          </li>
        ))}
      </ul>

      <AdicionarModalidadeForm />

      <div
        className="card"
        style={{
          marginTop: "clamp(24px, 6vw, 32px)",
          padding: "clamp(16px, 4vw, 20px)",
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        <p style={{ margin: 0, fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
          <strong>Onde são usadas:</strong> criação de aulas (Turmas), critérios de avaliação por modalidade, modalidade principal do aluno (filtro na lista de Alunos), presenças e avaliações nas aulas.
        </p>
      </div>
    </div>
  );
}
