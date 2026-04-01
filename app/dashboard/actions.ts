"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { revalidatePath } from "next/cache";
import { getPlanAccess } from "@/lib/plan-access";
import { performCheckIn } from "@/lib/perform-check-in";
import { weekdayFromYmd } from "@/lib/lesson-occurrences";

/** Ciclo de Presença 2.0: Intenção (RSVP) – Vou = PENDING, Não vou = ABSENT. */
export async function setAttendanceIntention(
  lessonId: string,
  intention: "vou" | "nao_vou",
  occurrenceDate: string
): Promise<{ error?: string }> {
  const studentId = await getCurrentStudentId();
  if (!studentId) return { error: "Sessão inválida. Faz login como aluno." };

  const occ = occurrenceDate.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occ)) {
    return { error: "Data da aula inválida." };
  }

  const supabase = await createClient();
  const planAccess = await getPlanAccess(supabase, studentId);

  const { data: lessonRow } = await supabase
    .from("Lesson")
    .select("isOpenClass, date, isOneOff, weekday")
    .eq("id", lessonId)
    .single();
  if (!lessonRow) return { error: "Aula não encontrada." };

  const isOpenClass = Boolean((lessonRow as { isOpenClass?: boolean }).isOpenClass);
  if (!planAccess.hasCheckIn && !isOpenClass) {
    return { error: "O teu plano não inclui check-in de aulas presenciais." };
  }

  const rawDate = (lessonRow as { date?: string | null }).date;
  if (rawDate != null && String(rawDate).slice(0, 10) !== occ) {
    return { error: "Data inválida para esta aula." };
  }
  if (rawDate == null) {
    const wd = (lessonRow as { weekday?: number | null }).weekday;
    if (wd != null && weekdayFromYmd(occ) !== wd) {
      return { error: "Data inválida para esta aula." };
    }
  }

  const status = intention === "vou" ? "PENDING" : "ABSENT";

  const { data: existing } = await supabase
    .from("Attendance")
    .select("id")
    .eq("lessonId", lessonId)
    .eq("studentId", studentId)
    .eq("occurrenceDate", occ)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("Attendance")
      .update({ status })
      .eq("id", (existing as { id: string }).id);
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
      occurrenceDate: occ,
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
  const result = await performCheckIn(lessonId);
  if (!result.error && result.checkedInAt) {
    revalidatePath("/dashboard");
    revalidatePath(`/check-in/${lessonId}`);
  }
  return result;
}

/** Para useFormState: recebe formData com lessonId, occurrenceDate e intention (vou | nao_vou). */
export async function setAttendanceIntentionFromForm(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string } | null> {
  const lessonId = (formData.get("lessonId") as string)?.trim();
  const raw = formData.get("intention");
  const intention = typeof raw === "string" ? raw.trim() : "";
  const occurrenceDate = (formData.get("occurrenceDate") as string)?.trim().slice(0, 10) ?? "";
  if (!lessonId || (intention !== "vou" && intention !== "nao_vou")) return { error: "Dados inválidos." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurrenceDate)) return { error: "Data da aula inválida." };
  return setAttendanceIntention(lessonId, intention, occurrenceDate);
}

/** @deprecated Use checkIn() para QR ou setAttendanceIntention() para intenção. */
export async function markPresence(lessonId: string): Promise<{ error?: string }> {
  const r = await checkIn(lessonId);
  return r;
}
