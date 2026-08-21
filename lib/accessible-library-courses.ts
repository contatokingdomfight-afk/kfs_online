import type { SupabaseClient } from "@supabase/supabase-js";
import type { LibraryCourseRef } from "@/lib/library-improve-suggestions";

/** Cursos activos que o aluno pode abrir (plano digital e/ou compras). */
export async function getAccessibleLibraryCoursesForStudent(
  supabase: SupabaseClient,
  studentId: string
): Promise<{ courses: LibraryCourseRef[]; primaryModality: string | null }> {
  const { data: student } = await supabase
    .from("Student")
    .select("planId, primaryModality")
    .eq("id", studentId)
    .maybeSingle();

  const planId = (student as { planId?: string | null } | null)?.planId ?? null;
  const primaryModality = (student as { primaryModality?: string | null } | null)?.primaryModality ?? null;

  let hasDigitalAccess = false;
  if (planId) {
    const { data: plan } = await supabase
      .from("Plan")
      .select("includesDigitalAccess")
      .eq("id", planId)
      .eq("isActive", true)
      .maybeSingle();
    hasDigitalAccess = plan?.includesDigitalAccess === true;
  }

  const [{ data: purchasesData }, { data: coursesData }] = await Promise.all([
    supabase.from("CoursePurchase").select("courseId").eq("studentId", studentId),
    supabase
      .from("Course")
      .select("id, name, category, modality, included_in_digital_plan")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  const purchasedIds = new Set((purchasesData ?? []).map((p: { courseId: string }) => p.courseId));
  const courses = (coursesData ?? [])
    .filter(
      (c: { id: string; included_in_digital_plan?: boolean }) =>
        (c.included_in_digital_plan && hasDigitalAccess) || purchasedIds.has(c.id)
    )
    .map((c: { id: string; name: string; category: string; modality: string | null }) => ({
      id: c.id,
      name: c.name,
      category: c.category,
      modality: c.modality,
    }));

  return { courses, primaryModality };
}
