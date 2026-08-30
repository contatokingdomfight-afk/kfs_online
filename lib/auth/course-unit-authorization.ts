import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type ActorResult = { ok: true } | { ok: false; error: string };

/**
 * Autorização partilhada para criar/editar unidades de curso (CourseUnit) e para o
 * upload de PDF: ADMIN tem acesso total; COACH só se `Student.can_create_courses` for
 * verdadeiro E for o criador do curso (`Course.creator_student_id`). Se `moduleId` for
 * passado, confirma também que pertence a `courseId` — evita um coach forjar um
 * `moduleId` de outro curso.
 */
export async function assertCourseUnitActor(
  dbUser: { id: string; role: string } | null | undefined,
  courseId: string,
  moduleId?: string
): Promise<ActorResult> {
  if (!dbUser) return { ok: false, error: "Não autorizado." };
  if (dbUser.role === "ADMIN") return { ok: true };
  if (dbUser.role !== "COACH") return { ok: false, error: "Não autorizado." };

  const supabase = createAdminClient();

  const { data: student } = await supabase
    .from("Student")
    .select("id, can_create_courses")
    .eq("userId", dbUser.id)
    .maybeSingle();

  if (!student || !student.can_create_courses) {
    return { ok: false, error: "Não autorizado. Solicite permissão ao administrador." };
  }

  const { data: course } = await supabase
    .from("Course")
    .select("id, creator_student_id")
    .eq("id", courseId)
    .maybeSingle();

  if (!course || course.creator_student_id !== student.id) {
    return { ok: false, error: "Não tens permissão para editar este curso." };
  }

  if (moduleId) {
    const { data: module_ } = await supabase
      .from("CourseModule")
      .select("id, course_id")
      .eq("id", moduleId)
      .maybeSingle();

    if (!module_ || module_.course_id !== courseId) {
      return { ok: false, error: "Módulo inválido." };
    }
  }

  return { ok: true };
}
