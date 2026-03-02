"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";

export type CoCreatorResult = { error?: string };

export async function addCoCreator(
  _prev: CoCreatorResult | null,
  formData: FormData
): Promise<CoCreatorResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || (dbUser.role !== "COACH" && dbUser.role !== "ADMIN")) {
    return { error: "Não autorizado." };
  }

  const courseId = (formData.get("courseId") as string)?.trim();
  const coachEmail = (formData.get("coachEmail") as string)?.trim().toLowerCase();
  const revenuePctRaw = (formData.get("revenue_pct") as string)?.trim();
  const revenuePct = revenuePctRaw ? parseInt(revenuePctRaw, 10) : 0;

  if (!courseId) return { error: "Curso inválido." };
  if (!coachEmail) return { error: "Email do coach é obrigatório." };
  if (!revenuePct || revenuePct < 1 || revenuePct > 65) {
    return { error: "Percentual deve ser entre 1 e 65." };
  }

  const supabase = createAdminClient();

  // Verificar que o utilizador atual é o criador do curso
  const { data: requestorStudent } = await supabase
    .from("Student")
    .select("id")
    .eq("userId", dbUser.id)
    .single();

  if (!requestorStudent && dbUser.role !== "ADMIN") {
    return { error: "Sem perfil de aluno vinculado." };
  }

  const { data: course } = await supabase
    .from("Course")
    .select("id, creator_student_id")
    .eq("id", courseId)
    .single();

  if (!course) return { error: "Curso não encontrado." };
  if (dbUser.role !== "ADMIN" && course.creator_student_id !== requestorStudent?.id) {
    return { error: "Não tens permissão para gerir este curso." };
  }

  // Buscar o Student pelo email do coach
  const { data: coachUser } = await supabase
    .from("User")
    .select("id")
    .eq("email", coachEmail)
    .single();

  if (!coachUser) return { error: "Nenhum utilizador encontrado com esse email." };

  const { data: coachStudent } = await supabase
    .from("Student")
    .select("id")
    .eq("userId", coachUser.id)
    .single();

  if (!coachStudent) return { error: "Este utilizador não tem perfil de aluno/coach." };

  // Verificar soma total dos percentuais
  const { data: existingCreators } = await supabase
    .from("CourseCreator")
    .select("revenue_pct, student_id")
    .eq("course_id", courseId);

  const currentTotal = (existingCreators ?? []).reduce((sum, c) => sum + (c.revenue_pct ?? 0), 0);
  if (currentTotal + revenuePct > 65) {
    return { error: `Soma total dos percentuais não pode exceder 65%. Disponível: ${65 - currentTotal}%` };
  }

  const { error } = await supabase.from("CourseCreator").upsert(
    {
      id: crypto.randomUUID(),
      course_id: courseId,
      student_id: coachStudent.id,
      revenue_pct: revenuePct,
    },
    { onConflict: "course_id,student_id" }
  );

  if (error) return { error: error.message };

  revalidatePath(`/coach/cursos/${courseId}`);
  revalidatePath(`/admin/cursos/${courseId}`);
  return {};
}

export async function removeCoCreator(
  _prev: CoCreatorResult | null,
  formData: FormData
): Promise<CoCreatorResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || (dbUser.role !== "COACH" && dbUser.role !== "ADMIN")) {
    return { error: "Não autorizado." };
  }

  const courseId = (formData.get("courseId") as string)?.trim();
  const coCreatorId = (formData.get("coCreatorId") as string)?.trim();

  if (!courseId || !coCreatorId) return { error: "Parâmetros inválidos." };

  const supabase = createAdminClient();

  // Verificar permissão
  const { data: requestorStudent } = await supabase
    .from("Student")
    .select("id")
    .eq("userId", dbUser.id)
    .single();

  const { data: course } = await supabase
    .from("Course")
    .select("id, creator_student_id")
    .eq("id", courseId)
    .single();

  if (!course) return { error: "Curso não encontrado." };
  if (dbUser.role !== "ADMIN" && course.creator_student_id !== requestorStudent?.id) {
    return { error: "Não tens permissão para gerir este curso." };
  }

  const { error } = await supabase.from("CourseCreator").delete().eq("id", coCreatorId);
  if (error) return { error: error.message };

  revalidatePath(`/coach/cursos/${courseId}`);
  revalidatePath(`/admin/cursos/${courseId}`);
  return {};
}
