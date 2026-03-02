import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { DeleteCursoButton } from "./DeleteCursoButton";
import { CollapsibleCourseDetails } from "./CollapsibleCourseDetails";
import { ModuleCard } from "./ModuleCard";
import { ModuleForm } from "../modules/ModuleForm";
import { CoCreatorForm } from "@/app/coach/cursos/[id]/CoCreatorForm";

type Props = { params: Promise<{ id: string }> };

export default async function AdminCursosEditarPage({ params }: Props) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const { id: courseId } = await params;
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const [{ data: course }, { data: modules }, { data: coCreatorsRaw }] = await Promise.all([
    supabase.from("Course").select("id, name, description, category, modality, level, included_in_digital_plan, video_url, sort_order, is_active, price, available_for_purchase, creator_student_id, coach_revenue_pct").eq("id", courseId).single(),
    supabase.from("CourseModule").select("id, name, description, video_url, sort_order").eq("course_id", courseId).order("sort_order", { ascending: true }),
    supabase.from("CourseCreator").select("id, student_id, revenue_pct").eq("course_id", courseId),
  ]);

  const moduleIds = (modules ?? []).map((m) => m.id);
  let unitsByModule = new Map<string, { id: string; module_id: string; name: string; description: string | null; content_type: string; video_url: string | null; text_content: string | null; sort_order: number }[]>();
  if (moduleIds.length > 0) {
    const { data: units } = await supabase
      .from("CourseUnit")
      .select("id, module_id, name, description, content_type, video_url, text_content, sort_order")
      .in("module_id", moduleIds);
    (units ?? []).forEach((u) => {
      const list = unitsByModule.get(u.module_id) ?? [];
      list.push(u);
      unitsByModule.set(u.module_id, list);
    });
    unitsByModule.forEach((list) => list.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)));
  }

  // Resolver nomes dos co-criadores
  const coCreatorStudentIds = (coCreatorsRaw ?? []).map((cc) => cc.student_id);
  let coCreators: { id: string; student_id: string; revenue_pct: number; userName: string; userEmail: string }[] = [];
  if (coCreatorStudentIds.length > 0) {
    const { data: coCreatorStudents } = await supabase.from("Student").select("id, userId").in("id", coCreatorStudentIds);
    const ccUserIds = (coCreatorStudents ?? []).map((s) => s.userId);
    if (ccUserIds.length > 0) {
      const { data: ccUsers } = await supabase.from("User").select("id, name, email").in("id", ccUserIds);
      coCreators = (coCreatorsRaw ?? []).map((cc) => {
        const st = (coCreatorStudents ?? []).find((s) => s.id === cc.student_id);
        const u = st ? (ccUsers ?? []).find((u) => u.id === st.userId) : null;
        return { id: cc.id, student_id: cc.student_id, revenue_pct: cc.revenue_pct, userName: u?.name ?? "", userEmail: u?.email ?? "" };
      });
    }
  }
  const usedPct = coCreators.reduce((sum, cc) => sum + cc.revenue_pct, 0);

  if (!course) {
    return (
      <div>
        <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>Curso não encontrado.</p>
        <Link href="/admin/cursos" className="btn btn-secondary" style={{ textDecoration: "none" }}>
          ← Voltar
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "min(520px, 100%)" }}>
      <div style={{ marginBottom: "clamp(20px, 5vw, 24px)" }}>
        <Link
          href="/admin/cursos"
          style={{
            color: "var(--text-secondary)",
            fontSize: "clamp(15px, 3.8vw, 17px)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          ← Voltar
        </Link>
      </div>
      <h1 style={{ margin: "0 0 4px 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, color: "var(--text-primary)" }}>
        {course.name}
      </h1>
      <p style={{ margin: "0 0 clamp(20px, 5vw, 24px) 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
        Editar curso
      </p>

      {/* Conteúdo: Curso → Módulos → Unidades */}
      <div style={{ marginBottom: "clamp(24px, 6vw, 32px)" }}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Conteúdo do curso
        </h2>
        <p style={{ margin: "0 0 20px 0", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          Um curso tem <strong>módulos</strong>. Cada módulo tem <strong>unidades</strong>. Cada unidade é um <strong>vídeo</strong> ou um <strong>texto</strong> para leitura.
        </p>

        {/* 1) Adicionar módulo — primeiro */}
        <div style={{ marginBottom: "clamp(20px, 5vw, 24px)" }}>
          <ModuleForm courseId={course.id} initialSortOrder={(modules ?? []).length} />
        </div>

        {/* 2) Lista de módulos (cada um com as suas unidades e botão para adicionar unidade) */}
        {(modules ?? []).length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "clamp(12px, 3vw, 16px)" }}>
            {(modules ?? []).map((m, idx) => (
              <ModuleCard
                key={m.id}
                courseId={course.id}
                module={{ id: m.id, name: m.name, description: m.description, sort_order: m.sort_order ?? 0 }}
                index={idx}
                units={(unitsByModule.get(m.id) ?? []).map((u) => ({ id: u.id, module_id: u.module_id, name: u.name, content_type: u.content_type, sort_order: u.sort_order ?? 0 }))}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dados do curso — recolhível, para não ocupar o ecrã */}
      <div style={{ marginBottom: "clamp(24px, 6vw, 32px)" }}>
        <CollapsibleCourseDetails
          course={{
            id: course.id,
            name: course.name,
            description: course.description,
            category: course.category,
            modality: course.modality,
            level: course.level,
            included_in_digital_plan: course.included_in_digital_plan,
            sort_order: course.sort_order,
            is_active: course.is_active,
            price: course.price,
            available_for_purchase: course.available_for_purchase,
          }}
        />
      </div>

      {/* Co-criadores do curso */}
      {course.creator_student_id && (
        <div style={{ marginBottom: "clamp(24px, 6vw, 32px)" }}>
          <h2 style={{ margin: "0 0 8px 0", fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, color: "var(--text-primary)" }}>
            Co-criadores
          </h2>
          <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "var(--text-secondary)" }}>
            Coaches que co-criam este curso e os seus percentuais de receita (sobre os 65% do coach).
          </p>
          <div className="card" style={{ padding: "clamp(16px, 4vw, 20px)" }}>
            <CoCreatorForm courseId={course.id} coCreators={coCreators} usedPct={usedPct} />
          </div>
        </div>
      )}

      <div>
        <DeleteCursoButton courseId={course.id} courseName={course.name} />
      </div>
    </div>
  );
}
