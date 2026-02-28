import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { CursoForm } from "../CursoForm";
import { DeleteCursoButton } from "./DeleteCursoButton";
import { ModuleForm } from "../modules/ModuleForm";
import { DeleteModuleButton } from "../modules/DeleteModuleButton";

type Props = { params: Promise<{ id: string }> };

export default async function AdminCursosEditarPage({ params }: Props) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const { id: courseId } = await params;
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const [{ data: course }, { data: modules }] = await Promise.all([
    supabase.from("Course").select("id, name, description, category, modality, level, included_in_digital_plan, video_url, sort_order, is_active, price, available_for_purchase").eq("id", courseId).single(),
    supabase.from("CourseModule").select("id, name, description, video_url, sort_order").eq("course_id", courseId).order("sort_order", { ascending: true }),
  ]);

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
        Editar curso
      </h1>
      <p style={{ margin: "0 0 clamp(20px, 5vw, 24px) 0", fontSize: "clamp(14px, 3.5vw, 16px)", color: "var(--text-secondary)" }}>
        {course.name}
      </p>
      <CursoForm
        courseId={course.id}
        initialName={course.name}
        initialDescription={course.description ?? ""}
        initialCategory={course.category ?? "TECHNIQUE"}
        initialModality={course.modality}
        initialIncludedInDigital={course.included_in_digital_plan ?? true}
        initialVideoUrl={course.video_url}
        initialSortOrder={course.sort_order ?? 0}
        initialIsActive={course.is_active ?? true}
        initialPrice={course.price != null ? Number(course.price) : null}
        initialAvailableForPurchase={course.available_for_purchase ?? false}
        initialLevel={course.level}
      />
      {/* Módulos do curso (Biblioteca 360º) */}
      <div style={{ marginTop: "clamp(24px, 6vw, 32px)" }}>
        <h2 style={{ margin: "0 0 12px 0", fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 600, color: "var(--text-primary)" }}>
          Módulos / Aulas
        </h2>
        <p style={{ margin: "0 0 16px 0", fontSize: 14, color: "var(--text-secondary)" }}>
          Adicione módulos com vídeos. Se não houver módulos, o curso usa o vídeo principal acima.
        </p>
        {(modules ?? []).length > 0 && (
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px 0", display: "flex", flexDirection: "column", gap: 8 }}>
            {(modules ?? []).map((m) => (
              <li
                key={m.id}
                className="card"
                style={{
                  padding: "12px 16px",
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{m.name}</span>
                  {m.video_url && <span style={{ fontSize: 12, color: "var(--text-secondary)", marginLeft: 8 }}>Vídeo</span>}
                </div>
                <DeleteModuleButton moduleId={m.id} courseId={course.id} moduleName={m.name} />
              </li>
            ))}
          </ul>
        )}
        <ModuleForm courseId={course.id} />
      </div>

      <div style={{ marginTop: "clamp(24px, 6vw, 32px)" }}>
        <DeleteCursoButton courseId={course.id} courseName={course.name} />
      </div>
    </div>
  );
}
