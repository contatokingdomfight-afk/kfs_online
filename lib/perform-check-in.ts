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
import { weekdayFromYmd } from "@/lib/lesson-occurrences";

const MODALITY_ALIASES: Record<string, string> = {
  MUAY_THAI: "MUAY_THAI",
  "MUAY THAI": "MUAY_THAI",
  MUAYTHAI: "MUAY_THAI",
  BOXING: "BOXING",
  KICKBOXING: "KICKBOXING",
  "KICK BOXING": "KICKBOXING",
};

function normalizeModalityCode(value: string | null | undefined): string | null {
  if (!value) return null;
  const key = value.trim().toUpperCase();
  return MODALITY_ALIASES[key] ?? null;
}

function resolveOccurrenceYmd(
  lesson: { date: string | null; weekday?: number | null },
  options?: { occurrenceDate?: string }
): { ok: true; ymd: string } | { ok: false; error: string } {
  if (lesson.date != null && String(lesson.date).trim() !== "") {
    const ymd = String(lesson.date).slice(0, 10);
    if (options?.occurrenceDate && options.occurrenceDate.slice(0, 10) !== ymd) {
      return { ok: false, error: "Data inválida para esta aula." };
    }
    return { ok: true, ymd };
  }
  const occ = options?.occurrenceDate?.slice(0, 10) ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occ)) {
    return {
      ok: false,
      error: "Indica a data desta aula (ex.: abre o link a partir do dashboard com a data correta).",
    };
  }
  if (lesson.weekday != null && weekdayFromYmd(occ) !== lesson.weekday) {
    return { ok: false, error: "Data inválida para esta aula recorrente." };
  }
  return { ok: true, ymd: occ };
}

/**
 * Check-in (QR / link). `occurrenceDate` opcional: obrigatório para aulas recorrentes (`Lesson.date` null).
 */
export async function performCheckIn(
  lessonId: string,
  options?: { occurrenceDate?: string }
): Promise<{ error?: string; checkedInAt?: string }> {
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

  if (existing) {
    const { error } = await supabase
      .from("Attendance")
      .update({ status: "CONFIRMED", checkedInAt: now })
      .eq("id", (existing as { id: string }).id);
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
      occurrenceDate: occurrenceYmd,
    });
    if (error) {
      console.error("checkIn insert error:", error);
      return { error: error.message };
    }
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

  return { checkedInAt: now };
}
