"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";

const CATEGORIES = ["TECHNIQUE", "MINDSET", "PERFORMANCE"] as const;

export type CoachCourseFormResult = { error?: string };

async function getAuthorizedCoachStudent() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || (dbUser.role !== "COACH" && dbUser.role !== "ADMIN")) return null;

  const supabase = createAdminClient();
  const { data: student } = await supabase
    .from("Student")
    .select("id, can_create_courses")
    .eq("userId", dbUser.id)
    .single();

  if (!student?.can_create_courses) return null;
  return student;
}

export async function createCoachCourse(
  _prev: CoachCourseFormResult | null,
  formData: FormData
): Promise<CoachCourseFormResult> {
  const student = await getAuthorizedCoachStudent();
  if (!student) return { error: "Não autorizado. Solicite permissão ao administrador." };

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const category = (formData.get("category") as string)?.trim() || "TECHNIQUE";
  const modality = (formData.get("modality") as string)?.trim() || null;
  const level = (formData.get("level") as string)?.trim() || null;
  const priceStr = (formData.get("price") as string)?.trim();
  const price = priceStr ? parseFloat(priceStr) : null;
  const priceNum = price != null && !isNaN(price) && price > 0 ? price : null;
  const availableForPurchase = formData.get("available_for_purchase") === "on";

  if (!name) return { error: "Nome do curso é obrigatório." };
  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) return { error: "Categoria inválida." };
  if (!priceNum) return { error: "Preço é obrigatório para cursos de coach." };

  const supabase = createAdminClient();
  const id = crypto.randomUUID();

  const { error } = await supabase.from("Course").insert({
    id,
    name,
    description,
    category,
    modality,
    level,
    included_in_digital_plan: false,
    sort_order: 0,
    is_active: false,
    available_for_purchase: availableForPurchase,
    price: priceNum,
    creator_student_id: student.id,
    coach_revenue_pct: 65,
  });

  if (error) return { error: error.message };

  revalidatePath("/coach/cursos");
  redirect(`/coach/cursos/${id}`);
}

export async function updateCoachCourse(
  _prev: CoachCourseFormResult | null,
  formData: FormData
): Promise<CoachCourseFormResult> {
  const student = await getAuthorizedCoachStudent();
  if (!student) return { error: "Não autorizado." };

  const courseId = (formData.get("courseId") as string)?.trim();
  if (!courseId) return { error: "ID do curso inválido." };

  const supabase = createAdminClient();

  const { data: course } = await supabase
    .from("Course")
    .select("id, creator_student_id")
    .eq("id", courseId)
    .single();

  if (!course || course.creator_student_id !== student.id)
    return { error: "Não tens permissão para editar este curso." };

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const category = (formData.get("category") as string)?.trim() || "TECHNIQUE";
  const modality = (formData.get("modality") as string)?.trim() || null;
  const level = (formData.get("level") as string)?.trim() || null;
  const priceStr = (formData.get("price") as string)?.trim();
  const price = priceStr ? parseFloat(priceStr) : null;
  const priceNum = price != null && !isNaN(price) && price > 0 ? price : null;
  const availableForPurchase = formData.get("available_for_purchase") === "on";

  if (!name) return { error: "Nome é obrigatório." };

  const { error } = await supabase.from("Course").update({
    name,
    description,
    category,
    modality,
    level,
    price: priceNum,
    available_for_purchase: availableForPurchase,
  }).eq("id", courseId);

  if (error) return { error: error.message };

  revalidatePath("/coach/cursos");
  revalidatePath(`/coach/cursos/${courseId}`);
  revalidatePath("/dashboard/biblioteca");
  return {};
}
