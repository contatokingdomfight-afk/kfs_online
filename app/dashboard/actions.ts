"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { revalidatePath } from "next/cache";
import { grantBadgesIfEligible } from "@/lib/gamification";
import { createPresenceConfirmedNotification } from "@/lib/notifications/in-app";
import { sendCheckInConfirmation } from "@/lib/notifications/email";
import { getPlanAccess } from "@/lib/plan-access";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import {
  isWithinLessonCheckInWindow,
  lessonCheckInWindowEnd,
  lessonStartInstant,
} from "@/lib/lesson-check-in-window";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { formatInTimeZone } from "date-fns-tz";
import { LISBON_TZ } from "@/lib/lisbon-payment-dates";

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
  const studentId = await getCurrentStudentId();
  if (!studentId) return { error: "Sessão inválida. Faz login como aluno." };

  const supabase = await createClient();
  const planAccess = await getPlanAccess(supabase, studentId);
  if (!planAccess.hasCheckIn) return { error: "O teu plano não inclui check-in de aulas presenciais." };

  const { data: lessonData } = await supabase.from("Lesson").select("id, modality, date, startTime, endTime").eq("id", lessonId).single();
  if (!lessonData) return { error: "Aula não encontrada." };

  const windowFields = {
    date: lessonData.date,
    startTime: lessonData.startTime,
    endTime: lessonData.endTime,
  };
  const nowDate = new Date();
  if (!isWithinLessonCheckInWindow(windowFields, nowDate)) {
    const locale = await getLocaleFromCookies();
    const start = lessonStartInstant(windowFields);
    const winEnd = lessonCheckInWindowEnd(windowFields);
    if (nowDate.getTime() < start.getTime()) {
      const t = formatInTimeZone(start, LISBON_TZ, "HH:mm");
      return {
        error:
          locale === "en"
            ? `Check-in is available from ${t} on the day of the class.`
            : `O check-in só está disponível a partir das ${t} no dia da aula.`,
      };
    }
    if (nowDate.getTime() > winEnd.getTime()) {
      return {
        error:
          locale === "en"
            ? "The check-in window for this class has ended (until 3 hours after the scheduled end)."
            : "O período de check-in desta aula já terminou (até 3 horas após o fim do horário).",
      };
    }
    return {
      error:
        locale === "en"
          ? "Check-in is not available for this class at this time."
          : "Check-in não disponível para esta aula neste momento.",
    };
  }

  if (planAccess.primaryModality && planAccess.allowedModalities.length === 1 && lessonData.modality !== planAccess.primaryModality) {
    const modLabel = MODALITY_LABELS[planAccess.primaryModality] ?? planAccess.primaryModality;
    return { error: "O teu plano permite apenas aulas de " + modLabel + "." };
  }

  if (planAccess.maxCheckInsPerDay === 1) {
    const { data: sameDayLessons } = await supabase.from("Lesson").select("id").eq("date", lessonData.date);
    const sameDayIds = (sameDayLessons ?? []).map((l) => l.id).filter((id) => id !== lessonId);
    if (sameDayIds.length > 0) {
      const { count: otherConfirmed } = await supabase
        .from("Attendance")
        .select("id", { count: "exact", head: true })
        .eq("studentId", studentId)
        .eq("status", "CONFIRMED")
        .in("lessonId", sameDayIds);
      if ((otherConfirmed ?? 0) >= 1) return { error: "Só podes fazer um check-in por dia no teu plano." };
    }
  }

  const now = nowDate.toISOString();

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
  const { data: student } = await supabase.from("Student").select("userId").eq("id", studentId).single();
  if (lessonData && student) {
    await createPresenceConfirmedNotification(supabase, studentId, {
      modality: lessonData.modality,
      date: lessonData.date,
      startTime: lessonData.startTime,
      endTime: lessonData.endTime,
    });
    const { data: user } = await supabase.from("User").select("email, name").eq("id", student.userId).single();
    if (user?.email) {
      await sendCheckInConfirmation(user.email, user.name ?? null, {
        modality: lessonData.modality,
        date: lessonData.date,
        startTime: lessonData.startTime,
        endTime: lessonData.endTime,
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
