import Link from "next/link";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MODALITY_SCOPE_LABEL: Record<string, string> = {
  NONE: "Só digital",
  SINGLE: "Uma modalidade",
  ALL: "Todas as modalidades",
};

export default async function AdminPlanosPage() {
  noStore();
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  // Sessão do admin + RLS em Plan (allow_authenticated): mesmo projeto que o login (evita lista vazia
  // quando SUPABASE_SERVICE_ROLE_KEY / URL na Vercel não coincidem com o projeto onde estão os dados).
  const supabase = await createClient();
  const { data: plans, error: plansError } = await supabase
    .from("Plan")
    .select("id, name, description, priceMonthly, includesDigitalAccess, modalityScope, isActive, schoolId")
    .order("name", { ascending: true });

  if (plansError) {
    console.error("AdminPlanosPage Plan select:", plansError);
  }

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

      {plansError ? (
        <p style={{ color: "var(--danger, #c0392b)", fontSize: "clamp(15px, 3.8vw, 17px)" }}>
          Erro ao carregar planos: {plansError.message}
        </p>
      ) : list.length === 0 ? (
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
                  {!p.isActive && (
                    <span style={{ fontSize: 12, padding: "2px 6px", background: "var(--text-secondary)", color: "var(--bg)", borderRadius: "var(--radius-md)" }}>
                      Inativo
                    </span>
                  )}
                  <span style={{ marginLeft: "auto", fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: 600, color: "var(--primary)" }}>
                    €{Number(p.priceMonthly).toFixed(0)}/mês
                  </span>
                </div>
                {p.description && (
                  <p style={{ margin: "6px 0 0 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                    {p.description.slice(0, 120)}{p.description.length > 120 ? "…" : ""}
                  </p>
                )}
                <p style={{ margin: "4px 0 0 0", fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
                  {MODALITY_SCOPE_LABEL[p.modalityScope] ?? p.modalityScope}
                  {p.includesDigitalAccess ? " · Inclui plataforma digital" : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
