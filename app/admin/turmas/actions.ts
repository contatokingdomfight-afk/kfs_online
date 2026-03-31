"use server";

import { createClient } from "@/lib/supabase/server";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { coachTeachesAtSchool } from "@/lib/coach-schools";
import { revalidatePath } from "next/cache";
import {
  performDeleteLesson,
  type DeleteLessonScope,
  type DeleteLessonResult,
} from "@/lib/admin/delete-lesson";
import { formatInTimeZone } from "date-fns-tz";
import { LISBON_TZ } from "@/lib/lisbon-payment-dates";

const RECURRING_WEEKS = 1000; // ao criar aula recorrente, criar as próximas N semanas

function parseYmd(ymd: string): { y: number; m: number; d: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { y, m, d };
}

function ymdToUtcDate(ymd: string): Date | null {
  const p = parseYmd(ymd);
  if (!p) return null;
  return new Date(Date.UTC(p.y, p.m - 1, p.d));
}

function utcDateToYmd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday=1 ... Sunday=7 */
function weekdayFromUtcDate(d: Date): number {
  const js = d.getUTCDay(); // 0..6, Sunday=0
  return js === 0 ? 7 : js;
}

function addDaysUtc(d: Date, days: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + days));
}

function nextDateForWeekday(weekday: number, baseYmd: string): string {
  const base = ymdToUtcDate(baseYmd)!;
  const baseWd = weekdayFromUtcDate(base);
  const delta = (weekday - baseWd + 7) % 7;
  return utcDateToYmd(addDaysUtc(base, delta));
}

function getSupabaseForAdminWrite() {
  const adminResult = getAdminClientOrNull();
  return adminResult.client;
}

export async function createLesson(formData: FormData) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") {
    return { error: "Não autorizado." };
  }

  const supabase = getSupabaseForAdminWrite() ?? (await createClient());

  const modality = (formData.get("modality") as string)?.trim() || null;
  const date = formData.get("date") as string | null;
  const startTime = formData.get("startTime") as string | null;
  const endTime = formData.get("endTime") as string | null;
  const coachId = (formData.get("coachId") as string) || null;
  const schoolId = (formData.get("schoolId") as string)?.trim() || null;
  const locationId = (formData.get("locationId") as string)?.trim() || null;
  const capacityStr = formData.get("capacity") as string | null;
  const planningNotes = (formData.get("planningNotes") as string) || null;
  const isOneOff = formData.get("isOneOff") === "on"; // checkbox: marcado = aula única
  const isOpenClass = formData.get("isOpenClass") === "on";
  const weekdayStr = (formData.get("weekday") as string | null)?.trim() || null;

  if (!modality || !startTime || !endTime) {
    return { error: "Preencha modalidade, hora início e hora fim." };
  }
  if (!coachId) {
    return { error: "Seleciona um coach para a aula." };
  }
  if (!schoolId) {
    return { error: "Seleciona uma escola para a aula." };
  }

  const teachesHere = await coachTeachesAtSchool(supabase, coachId, schoolId);
  if (!teachesHere) {
    return {
      error:
        "O coach tem de estar associado à escola desta aula. Edita o coach em Coaches e marca as escolas onde leciona.",
    };
  }

  const capacity = capacityStr ? parseInt(capacityStr, 10) : null;
  if (capacityStr && (capacity === null || isNaN(capacity) || capacity < 1)) {
    return { error: "Capacidade deve ser um número positivo." };
  }

  if (startTime >= endTime) {
    return { error: "A hora de fim deve ser posterior à hora de início." };
  }

  let firstDate: string | null = null;
  if (isOneOff) {
    if (!date) return { error: "Seleciona a data da aula única." };
    if (!parseYmd(date)) return { error: "Data inválida." };
    firstDate = date;
  } else {
    const weekday = weekdayStr ? parseInt(weekdayStr, 10) : NaN;
    if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7) {
      return { error: "Seleciona um dia da semana para a recorrência." };
    }
    const todayLisbonYmd = formatInTimeZone(new Date(), LISBON_TZ, "yyyy-MM-dd");
    firstDate = nextDateForWeekday(weekday, todayLisbonYmd);
  }

  const count = isOneOff ? 1 : RECURRING_WEEKS;

  const rows: {
    id: string;
    modality: string;
    date: string;
    startTime: string;
    endTime: string;
    coachId: string;
    schoolId: string;
    locationId: string | null;
    capacity: number | null;
    planningNotes: string | null;
    isOneOff: boolean;
    isOpenClass: boolean;
  }[] = [];

  for (let i = 0; i < count; i++) {
    const base = ymdToUtcDate(firstDate)!;
    const dateStr = utcDateToYmd(addDaysUtc(base, i * 7));
    rows.push({
      id: crypto.randomUUID(),
      modality: modality!,
      date: dateStr,
      startTime: startTime!,
      endTime: endTime!,
      coachId: coachId!,
      schoolId,
      locationId: locationId || null,
      capacity: capacity ?? null,
      planningNotes: planningNotes || null,
      isOneOff: isOneOff || count === 1,
      isOpenClass,
    });
  }

  const { error } = await supabase.from("Lesson").insert(rows);

  if (error) {
    console.error("createLesson error:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/turmas");
  revalidatePath("/admin");
  return {
    success: true,
    created: count,
    message:
      count === 1
        ? `Aula criada para ${rows[0]!.date}.`
        : `${count} aulas criadas (de ${rows[0]!.date} até ${rows[rows.length - 1]!.date}).`,
  };
}

export type UpdateLessonResult = { error?: string; success?: boolean };

export async function updateLesson(
  _prev: UpdateLessonResult | null,
  formData: FormData
): Promise<UpdateLessonResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") {
    return { error: "Não autorizado." };
  }

  const lessonId = (formData.get("lessonId") as string)?.trim();
  const modality = (formData.get("modality") as string)?.trim();
  const date = (formData.get("date") as string)?.trim();
  const startTime = (formData.get("startTime") as string)?.trim();
  const endTime = (formData.get("endTime") as string)?.trim();
  const coachId = (formData.get("coachId") as string)?.trim();
  const locationId = (formData.get("locationId") as string)?.trim() || null;
  const capacityStr = (formData.get("capacity") as string)?.trim() || null;
  const planningNotes = (formData.get("planningNotes") as string)?.trim() || null;
  const isOpenClass = formData.get("isOpenClass") === "on";

  if (!lessonId || !modality || !date || !startTime || !endTime) {
    return { error: "Preencha modalidade, data, hora início e hora fim." };
  }
  if (!coachId) return { error: "Coach é obrigatório." };

  const capacity = capacityStr ? parseInt(capacityStr, 10) : null;
  if (capacityStr && (capacity === null || isNaN(capacity) || capacity < 1)) {
    return { error: "Capacidade deve ser um número positivo." };
  }

  const supabase = getSupabaseForAdminWrite() ?? (await createClient());
  const { error } = await supabase
    .from("Lesson")
    .update({
      modality,
      date,
      startTime,
      endTime,
      coachId,
      locationId: locationId || null,
      capacity: capacity ?? null,
      planningNotes: planningNotes || null,
      isOpenClass,
    })
    .eq("id", lessonId);

  if (error) return { error: error.message };

  revalidatePath("/admin/turmas");
  revalidatePath(`/admin/turmas/${lessonId}`);
  revalidatePath("/coach");
  revalidatePath("/coach/agenda");
  return { success: true };
}

export type { DeleteLessonScope, DeleteLessonResult };

/**
 * Remove uma aula ou todas as instâncias futuras da mesma série recorrente.
 * O fluxo principal na UI usa `POST /api/admin/turmas/delete-lesson` para evitar 400 nas Server Actions.
 */
export async function deleteLesson(
  lessonId: string,
  scope: DeleteLessonScope = "single",
  returnQuery?: string
): Promise<DeleteLessonResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") {
    return { error: "Não autorizado." };
  }
  return performDeleteLesson(lessonId, scope, returnQuery);
}
