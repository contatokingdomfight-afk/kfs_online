"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { revalidatePath } from "next/cache";
import { getPlanAccess } from "@/lib/plan-access";
import { performCheckIn } from "@/lib/perform-check-in";

/** Ciclo de Presença 2.0: Intenção (RSVP) – Vou = PENDING, Não vou = ABSENT. */
export async function setAttendanceIntention(
  lessonId: string,
  intention: "vou" | "nao_vou"
): Promise<{ error?: string }> {
  const studentId = await getCurrentStudentId();
  if (!studentId) return { error: "Sessão inválida. Faz login como aluno." };

  const supabase = await createClient();
  const planAccess = await getPlanAccess(supabase, studentId);
  if (!planAccess.hasCheckIn) return { error: "O teu plano não inclui check-in de aulas presenciais." };
  const status = intention === "vou" ? "PENDING" : "ABSENT";

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

/** Ciclo de Presença 2.0: Check-in via QR – confirmação imediata (CONFIRMED + checkedInAt). */
export async function checkIn(lessonId: string): Promise<{ error?: string; checkedInAt?: string }> {
  return performCheckIn(lessonId);
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

/** @deprecated Use checkIn() para QR ou setAttendanceIntention() para intenção. */
export async function markPresence(lessonId: string): Promise<{ error?: string }> {
  const r = await checkIn(lessonId);
  return r;
}
