import Link from "next/link";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";
import { CursoForm } from "../CursoForm";
import { DeleteCursoButton } from "./DeleteCursoButton";

type Props = { params: Promise<{ id: string }> };

export default async function AdminCursosEditarPage({ params }: Props) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const { id: courseId } = await params;
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const { data: course } = await supabase
    .from("Course")
    .select("id, name, description, category, modality, included_in_digital_plan, video_url, sort_order, is_active, price, available_for_purchase")
    .eq("id", courseId)
    .single();

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
      />
      <div style={{ marginTop: "clamp(24px, 6vw, 32px)" }}>
        <DeleteCursoButton courseId={course.id} courseName={course.name} />
      </div>
    </div>
  );
}
