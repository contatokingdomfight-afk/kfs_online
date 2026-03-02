import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { CoachCursoForm } from "../CoachCursoForm";
import { ModuleForm } from "@/app/admin/cursos/modules/ModuleForm";
import { DeleteModuleButton } from "@/app/admin/cursos/modules/DeleteModuleButton";
import { UnitForm } from "@/app/admin/cursos/modules/units/UnitForm";
import { DeleteUnitButton } from "@/app/admin/cursos/modules/units/DeleteUnitButton";

type Props = { params: Promise<{ id: string }> };

export default async function CoachEditarCursoPage({ params }: Props) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || (dbUser.role !== "COACH" && dbUser.role !== "ADMIN")) redirect("/dashboard");

  const { id: courseId } = await params;
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const { data: student } = await supabase
    .from("Student")
    .select("id, can_create_courses")
    .eq("userId", dbUser.id)
    .single();

  if (!student?.can_create_courses) redirect("/coach/cursos");

  const [{ data: course }, { data: modules }] = await Promise.all([
    supabase
      .from("Course")
      .select("id, name, description, category, modality, level, price, available_for_purchase, is_active, creator_student_id, coach_revenue_pct")
      .eq("id", courseId)
      .single(),
    supabase
      .from("CourseModule")
      .select("id, name, description, sort_order")
      .eq("course_id", courseId)
      .order("sort_order", { ascending: true }),
  ]);

  if (!course || course.creator_student_id !== student.id) redirect("/coach/cursos");

  const moduleIds = (modules ?? []).map((m) => m.id);
  const unitsByModule = new Map<string, { id: string; module_id: string; name: string; content_type: string; sort_order: number }[]>();
  if (moduleIds.length > 0) {
    const { data: units } = await supabase
      .from("CourseUnit")
      .select("id, module_id, name, content_type, sort_order")
      .in("module_id", moduleIds);
    (units ?? []).forEach((u) => {
      const list = unitsByModule.get(u.module_id) ?? [];
      list.push(u);
      unitsByModule.set(u.module_id, list);
    });
    unitsByModule.forEach((list) => list.sort((a, b) => a.sort_order - b.sort_order));
  }

  const kfsPct = 100 - (course.coach_revenue_pct ?? 65);

  return (
    <div style={{ maxWidth: "min(520px, 100%)" }}>
      <div style={{ marginBottom: "clamp(20px, 5vw, 24px)" }}>
        <Link href="/coach/cursos" style={{ color: "var(--text-secondary)", fontSize: "clamp(15px, 3.8vw, 17px)", textDecoration: "none", fontWeight: 500 }}>
          ← Voltar aos meus cursos
        </Link>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: "clamp(16px, 4vw, 20px)" }}>
        <h1 style={{ margin: 0, fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
          {course.name}
        </h1>
        <span
          style={{
            fontSize: 12,
            padding: "2px 10px",
            borderRadius: "var(--radius-md)",
            background: course.is_active ? "var(--success)" : "var(--surface)",
            color: course.is_active ? "#fff" : "var(--text-secondary)",
          }}
        >
          {course.is_active ? "Ativo" : "Em revisão"}
        </span>
      </div>

      <div
        style={{
          padding: "clamp(12px, 3vw, 14px)",
          background: "var(--surface)",
          borderRadius: "var(--radius-md)",
          borderLeft: "3px solid var(--primary)",
          marginBottom: "clamp(16px, 4vw, 20px)",
          fontSize: 14,
          color: "var(--text-secondary)",
        }}
      >
        Receita por venda: <strong style={{ color: "var(--primary)" }}>{course.coach_revenue_pct ?? 65}% para ti</strong> · {kfsPct}% para a KFS
        {course.price && (
          <span> · Preço: <strong style={{ color: "var(--text-primary)" }}>€{Number(course.price).toFixed(0)}</strong></span>
        )}
      </div>

      <CoachCursoForm
        courseId={course.id}
        initialName={course.name}
        initialDescription={course.description ?? ""}
        initialCategory={course.category ?? "TECHNIQUE"}
        initialModality={course.modality}
        initialLevel={course.level}
        initialPrice={course.price != null ? Number(course.price) : null}
        initialAvailableForPurchase={course.available_for_purchase ?? true}
      />

      <div style={{ marginTop: "clamp(24px, 6vw, 32px)" }}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Módulos e Unidades
        </h2>
        <p style={{ margin: "0 0 16px 0", fontSize: 14, color: "var(--text-secondary)" }}>
          Organiza o conteúdo do curso em módulos. Cada módulo pode ter vídeos ou textos.
        </p>

        {(modules ?? []).length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "clamp(16px, 4vw, 20px)", marginBottom: 20 }}>
            {(modules ?? []).map((m, idx) => {
              const units = unitsByModule.get(m.id) ?? [];
              return (
                <div key={m.id} className="card" style={{ padding: "clamp(16px, 4vw, 20px)" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
                    <span style={{ fontWeight: 600, fontSize: "clamp(15px, 3.8vw, 17px)", color: "var(--text-primary)" }}>
                      Módulo {idx + 1}: {m.name}
                    </span>
                    <DeleteModuleButton moduleId={m.id} courseId={course.id} moduleName={m.name} />
                  </div>
                  {units.length > 0 && (
                    <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px 0", display: "flex", flexDirection: "column", gap: 8 }}>
                      {units.map((u, uIdx) => (
                        <li key={u.id} style={{ padding: "8px 12px", background: "var(--surface)", borderRadius: "var(--radius-md)", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <div>
                            <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>{uIdx + 1}. {u.name}</span>
                            <span style={{ fontSize: 12, color: "var(--text-secondary)", marginLeft: 8 }}>
                              {u.content_type === "VIDEO" ? "Vídeo" : "Texto"}
                            </span>
                          </div>
                          <DeleteUnitButton unitId={u.id} courseId={course.id} unitName={u.name} />
                        </li>
                      ))}
                    </ul>
                  )}
                  <UnitForm courseId={course.id} moduleId={m.id} initialSortOrder={units.length} />
                </div>
              );
            })}
          </div>
        )}
        <ModuleForm courseId={course.id} />
      </div>
    </div>
  );
}
