import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { grantBadgesIfEligible } from "@/lib/gamification";
import { createPresenceConfirmedNotification } from "@/lib/notifications/in-app";
import { sendCheckInConfirmation } from "@/lib/notifications/email";
import { getPlanAccess } from "@/lib/plan-access";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import {
  isWithinLessonCheckInWindow,
  lessonCheckInWindowEnd,
  lessonHasValidSchedule,
  lessonStartInstant,
} from "@/lib/lesson-check-in-window";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { formatInTimeZone } from "date-fns-tz";
import { LISBON_TZ } from "@/lib/lisbon-payment-dates";
import { computeWellnessZone, type WellnessCheckInInput } from "@/lib/wellness-score";
import { resolveOccurrenceYmd } from "@/lib/resolve-check-in-occurrence";
import { normalizeModalityCode } from "@/lib/modality-normalize";

/**
 * Check-in (QR / link). `occurrenceDate` opcional: obrigatório para aulas recorrentes (`Lesson.date` null).
 * `wellness`: questionário pré-treino; zona VERMELHA não conta para gamificação (badges) nesta presença.
 */
export async function performCheckIn(
  lessonId: string,
  options?: {
    occurrenceDate?: string;
    wellness?: WellnessCheckInInput | "skip";
  }
): Promise<{ error?: string; checkedInAt?: string; attendanceId?: string }> {
  const studentId = await getCurrentStudentId();
  if (!studentId) return { error: "Sessão inválida. Faz login como aluno." };

  const supabase = await createClient();
  const planAccess = await getPlanAccess(supabase, studentId);

  const { data: lessonData } = await supabase
    .from("Lesson")
    .select("id, modality, date, startTime, endTime, isOpenClass, weekday")
    .eq("id", lessonId)
    .single();
  if (!lessonData) return { error: "Aula não encontrada." };

  const isOpenClass = Boolean((lessonData as { isOpenClass?: boolean }).isOpenClass);
  if (!planAccess.hasCheckIn && !isOpenClass) {
    return { error: "O teu plano não inclui check-in de aulas presenciais." };
  }

  const occ = resolveOccurrenceYmd(
    {
      date: (lessonData as { date?: string | null }).date ?? null,
      weekday: (lessonData as { weekday?: number | null }).weekday ?? null,
    },
    options
  );
  if (!occ.ok) return { error: occ.error };

  const occurrenceYmd = occ.ymd;

  const windowFields = {
    date: occurrenceYmd,
    startTime: lessonData.startTime,
    endTime: lessonData.endTime,
  };
  if (!lessonHasValidSchedule({ ...windowFields, date: occurrenceYmd })) {
    return { error: "Esta aula não tem horário completo na agenda. Contacta a receção." };
  }

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

  const studentPrimaryModality = normalizeModalityCode(planAccess.primaryModality);
  const isSingleModalityPlan = planAccess.allowedModalities.length === 1;
  if (
    !isOpenClass &&
    isSingleModalityPlan &&
    studentPrimaryModality &&
    lessonData.modality !== studentPrimaryModality
  ) {
    const modLabel = MODALITY_LABELS[studentPrimaryModality] ?? studentPrimaryModality;
    return { error: "Só podes fazer check-in na tua modalidade (" + modLabel + ") ou em aulas livres." };
  }

  if (planAccess.maxCheckInsPerDay === 1) {
    const { count: otherConfirmed } = await supabase
      .from("Attendance")
      .select("id", { count: "exact", head: true })
      .eq("studentId", studentId)
      .eq("status", "CONFIRMED")
      .eq("occurrenceDate", occurrenceYmd)
      .neq("lessonId", lessonId);
    if ((otherConfirmed ?? 0) >= 1) {
      return { error: "Só podes fazer um check-in por dia no teu plano." };
    }
  }

  const now = nowDate.toISOString();

  const { data: existing } = await supabase
    .from("Attendance")
    .select("id")
    .eq("lessonId", lessonId)
    .eq("studentId", studentId)
    .eq("occurrenceDate", occurrenceYmd)
    .maybeSingle();

  let attendanceId: string;

  if (existing) {
    attendanceId = (existing as { id: string }).id;
    const { error } = await supabase
      .from("Attendance")
      .update({ status: "CONFIRMED", checkedInAt: now })
      .eq("id", attendanceId);
    if (error) {
      console.error("checkIn update error:", error);
      return { error: error.message };
    }
  } else {
    attendanceId = crypto.randomUUID();
    const { error } = await supabase.from("Attendance").insert({
      id: attendanceId,
      lessonId,
      studentId,
      status: "CONFIRMED",
      checkedInAt: now,
      isExperimental: false,
      occurrenceDate: occurrenceYmd,
    });
    if (error) {
      console.error("checkIn insert error:", error);
      return { error: error.message };
    }
  }

  const wellnessOpt = options?.wellness;
  if (wellnessOpt && wellnessOpt !== "skip") {
    const zone = computeWellnessZone(wellnessOpt);
    const countsForGamification = zone !== "RED";

    const { data: existingW } = await supabase
      .from("PreLessonWellness")
      .select("id")
      .eq("studentId", studentId)
      .eq("lessonId", lessonId)
      .eq("occurrenceDate", occurrenceYmd)
      .maybeSingle();

    const row = {
      id: (existingW as { id?: string } | null)?.id ?? crypto.randomUUID(),
      studentId,
      lessonId,
      occurrenceDate: occurrenceYmd,
      sleepHours: wellnessOpt.sleepHours,
      sleepQuality: wellnessOpt.sleepQuality,
      hydrationOk: wellnessOpt.hydrationOk,
      stress: wellnessOpt.stress,
      fatigue: wellnessOpt.fatigue,
      wellnessZone: zone,
    };

    if (existingW) {
      const { error: wErr } = await supabase.from("PreLessonWellness").update(row).eq("id", (existingW as { id: string }).id);
      if (wErr) console.error("PreLessonWellness update:", wErr);
    } else {
      const { error: wErr } = await supabase.from("PreLessonWellness").insert(row);
      if (wErr) console.error("PreLessonWellness insert:", wErr);
    }

    await supabase.from("Attendance").update({ countsForGamification }).eq("id", attendanceId);
  }

  try {
    await grantBadgesIfEligible(supabase, studentId);
  } catch (e) {
    console.error("grantBadgesIfEligible:", e);
  }

  const lessonDataForNotify = { ...lessonData, date: occurrenceYmd };
  const { data: student } = await supabase.from("Student").select("userId").eq("id", studentId).single();
  if (lessonDataForNotify && student) {
    try {
      await createPresenceConfirmedNotification(supabase, studentId, {
        modality: lessonData.modality,
        date: occurrenceYmd,
        startTime: lessonData.startTime,
        endTime: lessonData.endTime,
      });
    } catch (e) {
      console.error("createPresenceConfirmedNotification:", e);
    }
    try {
      const { data: user } = await supabase.from("User").select("email, name").eq("id", student.userId).single();
      if (user?.email) {
        await sendCheckInConfirmation(user.email, user.name ?? null, {
          modality: lessonData.modality,
          date: occurrenceYmd,
          startTime: lessonData.startTime,
          endTime: lessonData.endTime,
        });
      }
    } catch (e) {
      console.error("sendCheckInConfirmation:", e);
    }
  }

  return { checkedInAt: now, attendanceId };
}
