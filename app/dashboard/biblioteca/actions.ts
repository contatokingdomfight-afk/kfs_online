"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { awardLessonWatchedXp } from "@/lib/course-watch-xp";

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
  await awardLessonWatchedXp(studentId, courseId);
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
  await awardLessonWatchedXp(studentId, courseId);
  revalidatePath(`/dashboard/biblioteca/${courseId}`);
  return {};
}
