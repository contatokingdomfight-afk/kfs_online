"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { rewriteSupabaseLegacyStoragePublicUrl } from "@/lib/supabase/rewrite-storage-public-url";
import { revalidatePath } from "next/cache";

export type SaveProfileResult = { error?: string; success?: boolean };

export async function saveStudentProfile(_prev: SaveProfileResult | null, formData: FormData): Promise<SaveProfileResult> {
  const studentId = await getCurrentStudentId();
  if (!studentId) return { error: "Sessão inválida. Faz login como aluno." };

  const name = (formData.get("name") as string)?.trim() || null;
  const avatarRaw = (formData.get("avatarUrl") as string)?.trim() || null;
  const avatarUrl = avatarRaw ? (rewriteSupabaseLegacyStoragePublicUrl(avatarRaw) ?? avatarRaw) : null;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const weightRaw = (formData.get("weightKg") as string)?.trim();
  const heightRaw = (formData.get("heightCm") as string)?.trim();
  const reachRaw = (formData.get("reachCm") as string)?.trim();
  const dateOfBirthRaw = (formData.get("dateOfBirth") as string)?.trim() || "";
  const dateOfBirth = dateOfBirthRaw || null;
  const medicalNotes = (formData.get("medicalNotes") as string)?.trim() || null;
  const emergencyContact = (formData.get("emergencyContact") as string)?.trim() || null;

  const weightKg = weightRaw === "" ? null : Number(weightRaw);
  const heightCm = heightRaw === "" ? null : Number(heightRaw);
  const reachCm = reachRaw === "" ? null : Number(reachRaw);
  if (weightRaw && (Number.isNaN(Number(weightRaw)) || Number(weightRaw) <= 0)) return { error: "Peso inválido." };
  if (heightRaw && (Number.isNaN(Number(heightRaw)) || Number(heightRaw) <= 0)) return { error: "Altura inválida." };
  if (reachRaw && (Number.isNaN(Number(reachRaw)) || Number(reachRaw) <= 0)) return { error: "Envergadura inválida." };

  if (dateOfBirthRaw) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirthRaw)) return { error: "Data de nascimento inválida." };
    const d = new Date(`${dateOfBirthRaw}T12:00:00.000Z`);
    if (Number.isNaN(d.getTime())) return { error: "Data de nascimento inválida." };
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (d > today) return { error: "A data de nascimento não pode ser no futuro." };
    const min = new Date();
    min.setFullYear(min.getFullYear() - 120);
    if (d < min) return { error: "Data de nascimento fora do intervalo aceite." };
  }

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
    reachCm: reachCm ?? null,
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
  revalidatePath("/dashboard/rank");
  return { success: true };
}
