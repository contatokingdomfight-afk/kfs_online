"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { revalidatePath } from "next/cache";

/** Cria ou atualiza a intenção de presença (Vou = CONFIRMED, Não vou = ABSENT). */
export async function setAttendanceIntention(
  lessonId: string,
  intention: "vou" | "nao_vou"
): Promise<{ error?: string }> {
  const studentId = await getCurrentStudentId();
  if (!studentId) return { error: "Sessão inválida. Faz login como aluno." };

  const supabase = await createClient();
  const status = intention === "vou" ? "CONFIRMED" : "ABSENT";

  const { data: existing } = await supabase
    .from("Attendance")
    .select("id")
    .eq("lessonId", lessonId)
    .eq("studentId", studentId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("Attendance")
      .update({ status })
      .eq("id", existing.id);
    if (error) {
      console.error("setAttendanceIntention update error:", error);
      return { error: error.message };
    }
  } else {
    const id = crypto.randomUUID();
    const { error } = await supabase.from("Attendance").insert({
      id,
      lessonId,
      studentId,
      status,
      isExperimental: false,
    });
    if (error) {
      console.error("setAttendanceIntention insert error:", error);
      return { error: error.message };
    }
  }

  revalidatePath("/dashboard");
  return {};
}

/** Para useFormState: recebe formData com lessonId e intention (vou | nao_vou). */
export async function setAttendanceIntentionFromForm(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string } | null> {
  const lessonId = (formData.get("lessonId") as string)?.trim();
  const intention = formData.get("intention") as "vou" | "nao_vou";
  if (!lessonId || (intention !== "vou" && intention !== "nao_vou")) return { error: "Dados inválidos." };
  return setAttendanceIntention(lessonId, intention);
}

/** Marcar presença (legado: cria PENDING; preferir Vou/Não vou). */
export async function markPresence(lessonId: string): Promise<{ error?: string }> {
  return setAttendanceIntention(lessonId, "vou");
}
