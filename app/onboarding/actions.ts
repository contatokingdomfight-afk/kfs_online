"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { revalidatePath } from "next/cache";

export type CompleteOnboardingResult = { error?: string };

export async function completeOnboarding(formData: FormData): Promise<CompleteOnboardingResult> {
  const studentId = await getCurrentStudentId();
  if (!studentId) return { error: "Sessão inválida. Faz login como aluno." };

  const dateOfBirth = (formData.get("dateOfBirth") as string)?.trim() || null;
  const weightRaw = (formData.get("weightKg") as string)?.trim();
  const heightRaw = (formData.get("heightCm") as string)?.trim();
  const goalsRaw = formData.get("goals") as string; // JSON array
  const schoolId = (formData.get("schoolId") as string)?.trim() || null;

  const weightKg = weightRaw === "" ? null : Number(weightRaw);
  const heightCm = heightRaw === "" ? null : Number(heightRaw);
  if (weightRaw && (Number.isNaN(Number(weightRaw)) || Number(weightRaw) <= 0)) return { error: "Peso inválido." };
  if (heightRaw && (Number.isNaN(Number(heightRaw)) || Number(heightRaw) <= 0)) return { error: "Altura inválida." };

  let goals: string[] | null = null;
  if (goalsRaw) {
    try {
      const parsed = JSON.parse(goalsRaw) as unknown;
      goals = Array.isArray(parsed) ? parsed.filter((g): g is string => typeof g === "string") : null;
    } catch {
      goals = null;
    }
  }

  const supabase = await createClient();

  if (schoolId) {
    const { error: studentError } = await supabase.from("Student").update({ schoolId }).eq("id", studentId);
    if (studentError) return { error: studentError.message };
  }

  const { data: existing } = await supabase
    .from("StudentProfile")
    .select("id")
    .eq("studentId", studentId)
    .maybeSingle();

  const row = {
    dateOfBirth: dateOfBirth || null,
    weightKg,
    heightCm,
    goals: goals && goals.length > 0 ? goals : null,
    hasCompletedOnboarding: true,
    updatedAt: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await supabase.from("StudentProfile").update(row).eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const id = crypto.randomUUID();
    const { error } = await supabase.from("StudentProfile").insert({ id, studentId, ...row });
    if (error) return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/onboarding");
  return {};
}
