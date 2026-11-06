import { getSchoolScope, scopedSchoolIds } from "@/lib/school-scope";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { listFamilyGroups, listFamilyGroupRequests, repairOrphanFamilyTitulars, backfillFamilyGroupTuitions } from "@/lib/family-group";

export const dynamic = "force-dynamic";

export default async function AdminFamiliasPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  await repairOrphanFamilyTitulars(result.client);
  await backfillFamilyGroupTuitions(result.client);
  const schoolIds = scopedSchoolIds(await getSchoolScope());
  const [groups, requests] = await Promise.all([
    listFamilyGroups(result.client, schoolIds),
    listFamilyGroupRequests(result.client, schoolIds),
  ]);

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
        Grupos familiares para desconto na mensalidade: cada pessoa tem o seu plano individual (acesso e
        quota de referência). A mensalidade combinada é cobrada no titular. Matrícula e seguro continuam
        individuais por membro.
      </p>

      {requests.length > 0 ? (
        <section className="card" style={{ padding: 14, marginBottom: 20, border: "1px solid color-mix(in srgb, var(--warning, #f59e0b) 45%, var(--border))" }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 600 }}>Pedidos de grupo familiar ({requests.length})</h2>
          <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--text-secondary)" }}>
            Marcaram «Faço parte de um grupo familiar» no fim da adesão. A mensalidade deles fica em espera até os juntares a um grupo.
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {requests.map((r) => (
              <li key={r.studentId} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", fontSize: 14 }}>
                <Link href={`/admin/alunos/${r.studentId}`} style={{ color: "inherit", fontWeight: 500 }}>
                  {r.name}
                </Link>
                {r.requestedAt ? (
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    {new Date(r.requestedAt).toLocaleDateString("pt-PT", { timeZone: "Europe/Lisbon" })}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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
                    {g.memberCount} {g.memberCount === 1 ? "membro" : "membros"}
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
