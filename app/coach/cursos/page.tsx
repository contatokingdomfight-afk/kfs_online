import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";

export default async function CoachCursosPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || (dbUser.role !== "COACH" && dbUser.role !== "ADMIN")) redirect("/dashboard");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const { data: student } = await supabase
    .from("Student")
    .select("id, can_create_courses")
    .eq("userId", dbUser.id)
    .single();

  if (!student?.can_create_courses) {
    return (
      <div style={{ maxWidth: "min(520px, 100%)" }}>
        <h1 style={{ margin: "0 0 16px 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Meus Cursos
        </h1>
        <div className="card" style={{ padding: "clamp(20px, 5vw, 24px)" }}>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "clamp(14px, 3.5vw, 16px)" }}>
            Ainda não tens permissão para criar cursos. Fala com o administrador da KFS para solicitar autorização.
          </p>
          <p style={{ margin: "12px 0 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
            Quando autorizado, podes publicar cursos na plataforma e receber 65% da receita de cada venda.
          </p>
        </div>
      </div>
    );
  }

  const { data: courses } = await supabase
    .from("Course")
    .select("id, name, description, is_active, price, available_for_purchase, category")
    .eq("creator_student_id", student.id)
    .order("name", { ascending: true });

  return (
    <div style={{ maxWidth: "min(620px, 100%)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: "clamp(20px, 5vw, 24px)" }}>
        <h1 style={{ margin: 0, fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Meus Cursos
        </h1>
        <Link href="/coach/cursos/novo" className="btn btn-primary" style={{ textDecoration: "none", fontSize: "clamp(14px, 3.5vw, 16px)" }}>
          + Novo curso
        </Link>
      </div>

      <div
        style={{
          padding: "clamp(12px, 3vw, 16px)",
          background: "var(--surface)",
          borderRadius: "var(--radius-md)",
          borderLeft: "3px solid var(--primary)",
          marginBottom: "clamp(16px, 4vw, 20px)",
        }}
      >
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>
          Divisão de receita: <strong style={{ color: "var(--primary)" }}>65% para ti</strong> · 35% para a KFS por cada venda.
          Os cursos ficam em revisão até o admin aprovar e ativar a publicação.
        </p>
      </div>

      {(courses ?? []).length === 0 ? (
        <div className="card" style={{ padding: "clamp(20px, 5vw, 24px)" }}>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "clamp(14px, 3.5vw, 16px)" }}>
            Ainda não criaste nenhum curso.
          </p>
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {(courses ?? []).map((c) => (
            <li key={c.id} className="card" style={{ padding: "clamp(14px, 3.5vw, 18px)" }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: "clamp(15px, 3.8vw, 17px)", color: "var(--text-primary)" }}>
                    {c.name}
                  </p>
                  {c.description && (
                    <p style={{ margin: "4px 0 0 0", fontSize: 14, color: "var(--text-secondary)" }}>
                      {c.description.slice(0, 80)}{c.description.length > 80 ? "…" : ""}
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: 12,
                      padding: "2px 8px",
                      borderRadius: "var(--radius-md)",
                      background: c.is_active ? "var(--success)" : "var(--surface)",
                      color: c.is_active ? "#fff" : "var(--text-secondary)",
                    }}
                  >
                    {c.is_active ? "Ativo" : "Em revisão"}
                  </span>
                  {c.price && (
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--primary)" }}>
                      €{Number(c.price).toFixed(0)}
                    </span>
                  )}
                  <Link
                    href={`/coach/cursos/${c.id}`}
                    style={{ fontSize: 14, color: "var(--primary)", textDecoration: "none", fontWeight: 500 }}
                  >
                    Editar →
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
