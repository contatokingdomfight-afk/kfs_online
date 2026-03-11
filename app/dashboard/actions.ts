"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { revalidatePath } from "next/cache";
import { grantBadgesIfEligible } from "@/lib/gamification";
import { createPresenceConfirmedNotification } from "@/lib/notifications/in-app";
import { sendCheckInConfirmation } from "@/lib/notifications/email";

/** Ciclo de Presença 2.0: Intenção (RSVP) – Vou = PENDING, Não vou = ABSENT. */
export async function setAttendanceIntention(
  lessonId: string,
  intention: "vou" | "nao_vou"
): Promise<{ error?: string }> {
  const studentId = await getCurrentStudentId();
  if (!studentId) return { error: "Sessão inválida. Faz login como aluno." };

  const supabase = await createClient();
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
  const studentId = await getCurrentStudentId();
  if (!studentId) return { error: "Sessão inválida. Faz login como aluno." };

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from("Attendance")
    .select("id")
    .eq("lessonId", lessonId)
    .eq("studentId", studentId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("Attendance")
      .update({ status: "CONFIRMED", checkedInAt: now })
      .eq("id", existing.id);
    if (error) {
      console.error("checkIn update error:", error);
      return { error: error.message };
    }
  } else {
    const id = crypto.randomUUID();
    const { error } = await supabase.from("Attendance").insert({
      id,
      lessonId,
      studentId,
      status: "CONFIRMED",
      checkedInAt: now,
      isExperimental: false,
    });
    if (error) {
      console.error("checkIn insert error:", error);
      return { error: error.message };
    }
  }

  await grantBadgesIfEligible(supabase, studentId);
  const { data: lesson } = await supabase
    .from("Lesson")
    .select("modality, date, startTime, endTime")
    .eq("id", lessonId)
    .single();
  const { data: student } = await supabase.from("Student").select("userId").eq("id", studentId).single();
  if (lesson && student) {
    await createPresenceConfirmedNotification(supabase, studentId, {
      modality: lesson.modality,
      date: lesson.date,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
    });
    const { data: user } = await supabase.from("User").select("email, name").eq("id", student.userId).single();
    if (user?.email) {
      await sendCheckInConfirmation(user.email, user.name ?? null, {
        modality: lesson.modality,
        date: lesson.date,
        startTime: lesson.startTime,
        endTime: lesson.endTime,
      });
    }
  }

  revalidatePath("/dashboard");
  revalidatePath(`/check-in/${lessonId}`);
  return { checkedInAt: now };
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
