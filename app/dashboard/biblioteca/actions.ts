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
