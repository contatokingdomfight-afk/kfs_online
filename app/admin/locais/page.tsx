import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCachedLocations } from "@/lib/cached-reference-data";

export default async function AdminLocaisPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;
  const locations = await getCachedLocations(supabase);

  return (
    <div style={{ maxWidth: "min(500px, 100%)" }}>
      <div style={{ marginBottom: "clamp(20px, 5vw, 24px)" }}>
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
        <h1 style={{ margin: "8px 0 0 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Locais
        </h1>
        <p style={{ margin: "4px 0 0 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
          Locais onde se realizam as aulas. A gestão detalhada é feita na criação/edição de turmas.
        </p>
      </div>
      {locations.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)" }}>
          Nenhum local registado. Os locais são criados ao configurar as turmas.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "clamp(8px, 2vw, 10px)" }}>
          {locations.map((l) => (
            <li key={l.id} className="card" style={{ padding: "clamp(12px, 3vw, 16px)" }}>
              <span style={{ fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 500, color: "var(--text-primary)" }}>
                {l.name}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
