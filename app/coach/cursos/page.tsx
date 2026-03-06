import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentSchoolId } from "@/lib/auth/get-current-school";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";

export default async function CoachCursosPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || (dbUser.role !== "COACH" && dbUser.role !== "ADMIN")) redirect("/dashboard");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;
  const schoolId = await getCurrentSchoolId();

  const { data: student } = await supabase
    .from("Student")
    .select("id, can_create_courses")
    .eq("userId", dbUser.id)
    .single();

  const isAdmin = dbUser.role === "ADMIN";
  const canCreate = student ? (student.can_create_courses || isAdmin) : false;

  if (!student) {
    return (
      <div style={{ maxWidth: "min(520px, 100%)" }}>
        <h1 style={{ margin: "0 0 16px 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Meus Cursos
        </h1>
        <div className="card" style={{ padding: "clamp(20px, 5vw, 24px)" }}>
          {isAdmin ? (
            <>
              <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "clamp(14px, 3.5vw, 16px)" }}>
                Como administrador, para criar cursos como professor precisas de um perfil de aluno associado ao teu utilizador. Caso contrário, gere todos os cursos em Admin.
              </p>
              <Link href="/admin/cursos" className="btn btn-primary" style={{ marginTop: 16, display: "inline-block", textDecoration: "none" }}>
                Ir para Admin → Cursos
              </Link>
            </>
          ) : (
            <>
              <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "clamp(14px, 3.5vw, 16px)" }}>
                Ainda não tens permissão para criar cursos. Fala com o administrador da KFS para solicitar autorização.
              </p>
              <p style={{ margin: "12px 0 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
                Quando autorizado, podes publicar cursos na plataforma e receber 65% da receita de cada venda.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!canCreate) {
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
    .select("id, name, description, is_active, price, available_for_purchase, category, included_in_digital_plan")
    .eq("creator_student_id", student.id)
    .order("name", { ascending: true });

  const courseIds = (courses ?? []).map((c) => c.id);
  let purchaseCountByCourseId = new Map<string, number>();
  let studentsWithDigitalPlanCount = 0;

  if (courseIds.length > 0) {
    const { data: purchases } = await supabase
      .from("CoursePurchase")
      .select("courseId")
      .in("courseId", courseIds);
    for (const cid of courseIds) {
      purchaseCountByCourseId.set(cid, (purchases ?? []).filter((p) => p.courseId === cid).length);
    }
    const hasDigitalPlanCourse = (courses ?? []).some((c) => (c as { included_in_digital_plan?: boolean }).included_in_digital_plan);
    if (hasDigitalPlanCourse) {
      const { data: plansWithDigital } = await supabase
        .from("Plan")
        .select("id")
        .eq("includes_digital_access", true)
        .eq("is_active", true);
      const planIds = (plansWithDigital ?? []).map((p) => p.id);
      if (planIds.length > 0) {
        let studentsQuery = supabase
          .from("Student")
          .select("id", { count: "exact", head: true })
          .in("planId", planIds)
          .eq("status", "ATIVO");
        if (schoolId) studentsQuery = studentsQuery.eq("schoolId", schoolId);
        const { count } = await studentsQuery;
        studentsWithDigitalPlanCount = count ?? 0;
      }
    }
  }

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
          {(courses ?? []).map((c) => {
            const purchaseCount = purchaseCountByCourseId.get(c.id) ?? 0;
            const includedInDigital = (c as { included_in_digital_plan?: boolean }).included_in_digital_plan;
            return (
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
                    <p style={{ margin: "6px 0 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
                      {purchaseCount === 0 && !includedInDigital && "Nenhum aluno com acesso ainda."}
                      {purchaseCount > 0 && <span><strong>{purchaseCount}</strong> {purchaseCount === 1 ? "aluno comprou" : "alunos compraram"}.</span>}
                      {includedInDigital && studentsWithDigitalPlanCount > 0 && (
                        <span>
                          {purchaseCount > 0 ? " · " : ""}
                          <strong>{studentsWithDigitalPlanCount}</strong> {studentsWithDigitalPlanCount === 1 ? "aluno tem" : "alunos têm"} acesso pelo plano digital.
                        </span>
                      )}
                    </p>
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
            );
          })}
        </ul>
      )}
    </div>
  );
}
