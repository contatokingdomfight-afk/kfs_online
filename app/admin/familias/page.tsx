import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { listFamilyGroups, repairOrphanFamilyTitulars } from "@/lib/family-group";

export const dynamic = "force-dynamic";

export default async function AdminFamiliasPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  await repairOrphanFamilyTitulars(result.client);
  const groups = await listFamilyGroups(result.client);

  return (
    <div style={{ maxWidth: "min(760px, 100%)" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <Link href="/admin" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: 15 }}>
          ← Voltar
        </Link>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Planos família</h1>
        <Link href="/admin/familias/novo" className="btn btn-primary" style={{ marginLeft: "auto", textDecoration: "none" }}>
          Novo grupo
        </Link>
      </div>

      <p style={{ color: "var(--text-secondary)", marginBottom: 20, fontSize: 15, lineHeight: 1.5 }}>
        Grupos familiares com mensalidade única no titular. Cada membro mantém matrícula e seguro individuais.
      </p>

      {groups.length === 0 ? (
        <p style={{ color: "var(--text-secondary)" }}>Ainda não há grupos familiares.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {groups.map((g) => (
            <li key={g.id}>
              <Link
                href={`/admin/familias/${g.id}`}
                className="card"
                style={{ display: "block", padding: 14, textDecoration: "none", color: "inherit" }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  <span style={{ fontWeight: 600 }}>{g.name || "Grupo familiar"}</span>
                  {!g.isActive && (
                    <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 6, background: "var(--text-secondary)", color: "var(--bg)" }}>
                      Inactivo
                    </span>
                  )}
                  <span style={{ marginLeft: "auto", fontSize: 14, color: "var(--text-secondary)" }}>
                    {g.memberCount}/{g.maxMembers} membros
                  </span>
                </div>
                <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>
                  Titular: {g.titularName}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
