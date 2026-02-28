"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { revalidatePath } from "next/cache";

export type SaveProfileResult = { error?: string; success?: boolean };

export async function saveStudentProfile(_prev: SaveProfileResult | null, formData: FormData): Promise<SaveProfileResult> {
  const studentId = await getCurrentStudentId();
  if (!studentId) return { error: "Sessão inválida. Faz login como aluno." };

  const name = (formData.get("name") as string)?.trim() || null;
  const avatarUrl = (formData.get("avatarUrl") as string)?.trim() || null;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const weightRaw = (formData.get("weightKg") as string)?.trim();
  const heightRaw = (formData.get("heightCm") as string)?.trim();
  const dateOfBirth = (formData.get("dateOfBirth") as string)?.trim() || null;
  const medicalNotes = (formData.get("medicalNotes") as string)?.trim() || null;
  const emergencyContact = (formData.get("emergencyContact") as string)?.trim() || null;

  const weightKg = weightRaw === "" ? null : Number(weightRaw);
  const heightCm = heightRaw === "" ? null : Number(heightRaw);
  if (weightRaw && (Number.isNaN(Number(weightRaw)) || Number(weightRaw) <= 0)) return { error: "Peso inválido." };
  if (heightRaw && (Number.isNaN(Number(heightRaw)) || Number(heightRaw) <= 0)) return { error: "Altura inválida." };

  const supabase = await createClient();
  const { data: student } = await supabase.from("Student").select("userId").eq("id", studentId).single();
  if (!student) return { error: "Aluno não encontrado." };

  const { error: userError } = await supabase
    .from("User")
    .update({ name, avatarUrl: avatarUrl || null })
    .eq("id", student.userId);
  if (userError) {
    console.error("saveStudentProfile user update error:", userError);
    return { error: userError.message };
  }

  const { data: existing } = await supabase
    .from("StudentProfile")
    .select("id")
    .eq("studentId", studentId)
    .maybeSingle();

  const row = {
    weightKg,
    heightCm,
    dateOfBirth: dateOfBirth || null,
    medicalNotes: medicalNotes || null,
    emergencyContact: emergencyContact || null,
    phone: phone || null,
    updatedAt: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await supabase.from("StudentProfile").update(row).eq("id", existing.id);
    if (error) {
      console.error("saveStudentProfile update error:", error);
      return { error: error.message };
    }
  } else {
    const id = crypto.randomUUID();
    const { error } = await supabase.from("StudentProfile").insert({ id, studentId, ...row });
    if (error) {
      console.error("saveStudentProfile insert error:", error);
      return { error: error.message };
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/perfil");
  return { success: true };
}
