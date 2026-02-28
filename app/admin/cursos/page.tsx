import Link from "next/link";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { MODALITY_LABELS } from "@/lib/lesson-utils";

const CATEGORY_LABELS: Record<string, string> = {
  TECHNIQUE: "Técnica",
  MINDSET: "Mindset",
  PERFORMANCE: "Performance",
};

export default async function AdminCursosPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;
  const { data: courses } = await supabase
    .from("Course")
    .select("id, name, description, category, modality, included_in_digital_plan, video_url, sort_order, is_active, price, available_for_purchase")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  const list = courses ?? [];

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
          Cursos / Biblioteca
        </h1>
        <Link
          href="/admin/cursos/novo"
          className="btn btn-primary"
          style={{ marginLeft: "auto", textDecoration: "none" }}
        >
          Novo curso
        </Link>
      </div>

      {list.length === 0 ? (
        <p style={{ color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)" }}>
          Ainda não há cursos. Cadastre o primeiro em &quot;Novo curso&quot;.
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
          {list.map((c) => (
            <li key={c.id}>
              <Link
                href={`/admin/cursos/${c.id}`}
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
                    {c.name}
                  </span>
                  {!c.is_active && (
                    <span
                      style={{
                        fontSize: 12,
                        padding: "2px 6px",
                        background: "var(--text-secondary)",
                        color: "var(--bg)",
                        borderRadius: "var(--radius-md)",
                      }}
                    >
                      Inativo
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: "clamp(12px, 3vw, 14px)",
                      padding: "2px 8px",
                      background: "var(--surface)",
                      borderRadius: "var(--radius-md)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {CATEGORY_LABELS[c.category] ?? c.category}
                  </span>
                  {c.modality && (
                    <span style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "var(--text-secondary)" }}>
                      {MODALITY_LABELS[c.modality] ?? c.modality}
                    </span>
                  )}
                  {c.included_in_digital_plan && (
                    <span style={{ fontSize: 12, color: "var(--primary)" }}>Incl. plano digital</span>
                  )}
                  {c.available_for_purchase && c.price != null && (
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      Compra avulsa €{Number(c.price).toFixed(0)}
                    </span>
                  )}
                </div>
                {c.description && (
                  <p style={{ margin: "6px 0 0 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
                    {c.description.slice(0, 120)}
                    {c.description.length > 120 ? "…" : ""}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
