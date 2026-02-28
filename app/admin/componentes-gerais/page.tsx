import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { AdicionarDimensionForm } from "./AdicionarDimensionForm";
import { DeleteDimensionButton } from "./DeleteDimensionButton";

export const dynamic = "force-dynamic";

export default async function AdminComponentesGeraisPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const { data: dimensions } = await supabase
    .from("GeneralDimension")
    .select("id, code, name, sortOrder")
    .order("sortOrder", { ascending: true });

  const list = dimensions ?? [];

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
          Componentes gerais
        </h1>
      </div>

      <p style={{ margin: "0 0 clamp(16px, 4vw, 20px) 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
        Estas componentes são padrão em todas as modalidades (Técnico, Tático, Físico, Mental, Teórico). Podes adicionar novas. Em cada modalidade, os critérios dentro de cada componente são configuráveis em <Link href="/admin/avaliacao" style={{ color: "var(--primary)", textDecoration: "underline" }}>Critérios de avaliação</Link>.
      </p>

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(10px, 2.5vw, 12px)" }}>
        {list.map((d) => (
          <li
            key={d.id}
            className="card"
            style={{ padding: "clamp(14px, 3.5vw, 18px)", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--text-primary)" }}>
                {d.name}
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
                {d.code}
              </span>
            </div>
            <DeleteDimensionButton dimensionId={d.id} dimensionName={d.name} />
          </li>
        ))}
      </ul>

      <AdicionarDimensionForm />
    </div>
  );
}
