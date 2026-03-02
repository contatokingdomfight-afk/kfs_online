"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";

export async function purchaseCourse(courseId: string): Promise<{ error?: string }> {
  const studentId = await getCurrentStudentId();
  if (!studentId) return { error: "Sessão inválida. Faça login como aluno." };

  const supabase = await createClient();
  const { data: course } = await supabase
    .from("Course")
    .select("id, name, price, available_for_purchase, is_active")
    .eq("id", courseId)
    .single();

  if (!course || !course.is_active) return { error: "Curso não encontrado." };
  if (!course.available_for_purchase) return { error: "Este curso não está disponível para compra avulsa." };
  const amount = course.price != null ? Number(course.price) : 0;
  if (amount <= 0) return { error: "Preço não definido. Contacte a escola." };

  const { data: existing } = await supabase
    .from("CoursePurchase")
    .select("id")
    .eq("studentId", studentId)
    .eq("courseId", courseId)
    .maybeSingle();
  if (existing) return { error: "Já tens acesso a este curso." };

  const { error } = await supabase.from("CoursePurchase").insert({
    studentId,
    courseId,
    amount,
    status: "PAID",
  });

  if (error) {
    console.error("purchaseCourse error:", error);
    return { error: error.message };
  }
  revalidatePath("/dashboard/biblioteca");
  revalidatePath(`/dashboard/biblioteca/${courseId}`);
  return {};
}

export async function completeModule(moduleId: string, courseId: string): Promise<{ error?: string }> {
  const studentId = await getCurrentStudentId();
  if (!studentId) return { error: "Sessão inválida. Faça login como aluno." };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("CourseProgress")
    .select("id")
    .eq("student_id", studentId)
    .eq("module_id", moduleId)
    .maybeSingle();
  if (existing) return {}; // já concluído

  const id = crypto.randomUUID();
  const { error } = await supabase.from("CourseProgress").insert({
    id,
    student_id: studentId,
    module_id: moduleId,
  });

  if (error) {
    console.error("completeModule error:", error);
    return { error: error.message };
  }
  revalidatePath(`/dashboard/biblioteca/${courseId}`);
  return {};
}

export async function completeUnit(unitId: string, courseId: string): Promise<{ error?: string }> {
  const studentId = await getCurrentStudentId();
  if (!studentId) return { error: "Sessão inválida. Faça login como aluno." };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("CourseUnitProgress")
    .select("id")
    .eq("student_id", studentId)
    .eq("unit_id", unitId)
    .maybeSingle();
  if (existing) return {}; // já concluído

  const id = crypto.randomUUID();
  const { error } = await supabase.from("CourseUnitProgress").insert({
    id,
    student_id: studentId,
    unit_id: unitId,
  });

  if (error) {
    console.error("completeUnit error:", error);
    return { error: error.message };
  }
  revalidatePath(`/dashboard/biblioteca/${courseId}`);
  return {};
}
