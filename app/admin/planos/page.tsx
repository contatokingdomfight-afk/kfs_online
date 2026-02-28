import Link from "next/link";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";

const MODALITY_SCOPE_LABEL: Record<string, string> = {
  NONE: "Só digital",
  SINGLE: "Uma modalidade",
  ALL: "Todas as modalidades",
};

export default async function AdminPlanosPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;
  const { data: plans } = await supabase
    .from("Plan")
    .select("id, name, description, price_monthly, includes_digital_access, modality_scope, is_active")
    .order("name", { ascending: true });

  const list = plans ?? [];

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
          Planos
        </h1>
        <Link
          href="/admin/planos/novo"
          className="btn btn-primary"
          style={{ marginLeft: "auto", textDecoration: "none" }}
        >
          Novo plano
        </Link>
      </div>

      {list.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)" }}>
          Ainda não há planos cadastrados.
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
          {list.map((p) => (
            <li key={p.id}>
              <Link
                href={`/admin/planos/${p.id}`}
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
                    {p.name}
                  </span>
                  {!p.is_active && (
                    <span style={{ fontSize: 12, padding: "2px 6px", background: "var(--text-secondary)", color: "var(--bg)", borderRadius: "var(--radius-md)" }}>
                      Inativo
                    </span>
                  )}
                  <span style={{ marginLeft: "auto", fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--primary)" }}>
                    €{Number(p.price_monthly).toFixed(0)}/mês
                  </span>
                </div>
                {p.description && (
                  <p style={{ margin: "6px 0 0 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                    {p.description.slice(0, 120)}{p.description.length > 120 ? "…" : ""}
                  </p>
                )}
                <p style={{ margin: "4px 0 0 0", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
                  {MODALITY_SCOPE_LABEL[p.modality_scope] ?? p.modality_scope}
                  {p.includes_digital_access ? " · Inclui plataforma digital" : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
