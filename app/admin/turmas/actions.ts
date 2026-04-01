"use server";

import { createClient } from "@/lib/supabase/server";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { coachTeachesAtSchool } from "@/lib/coach-schools";
import { revalidatePath } from "next/cache";
import { performDeleteLesson, type DeleteLessonResult } from "@/lib/admin/delete-lesson";
import { performUpdateLesson, type UpdateLessonResult } from "@/lib/admin/update-lesson";

function parseYmd(ymd: string): { y: number; m: number; d: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { y, m, d };
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
  const coachIdsRaw = formData.getAll("coachIds");
  const coachIds = coachIdsRaw.map((x) => String(x).trim()).filter(Boolean);
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
  if (coachIds.length === 0) {
    return { error: "Seleciona pelo menos um professor para a aula." };
  }
  if (!schoolId) {
    return { error: "Seleciona uma escola para a aula." };
  }

  for (const cid of coachIds) {
    const teachesHere = await coachTeachesAtSchool(supabase, cid, schoolId);
    if (!teachesHere) {
      return {
        error:
          "Todos os professores têm de estar associados à escola desta aula. Edita o coach em Coaches e marca as escolas onde leciona.",
      };
    }
  }

  const capacity = capacityStr ? parseInt(capacityStr, 10) : null;
  if (capacityStr && (capacity === null || isNaN(capacity) || capacity < 1)) {
    return { error: "Capacidade deve ser um número positivo." };
  }

  if (startTime >= endTime) {
    return { error: "A hora de fim deve ser posterior à hora de início." };
  }

  let firstDate: string | null = null;
  let weekdayNum: number | null = null;
  if (isOneOff) {
    if (!date) return { error: "Seleciona a data da aula única." };
    if (!parseYmd(date)) return { error: "Data inválida." };
    firstDate = date;
  } else {
    const w = weekdayStr ? parseInt(weekdayStr, 10) : NaN;
    if (!Number.isInteger(w) || w < 1 || w > 7) {
      return { error: "Seleciona um dia da semana para a recorrência." };
    }
    weekdayNum = w;
  }

  const lessonId = crypto.randomUUID();

  const row = {
    id: lessonId,
    modality: modality!,
    date: isOneOff ? firstDate! : null,
    weekday: isOneOff ? null : weekdayNum,
    startTime: startTime!,
    endTime: endTime!,
    coachId: coachIds[0]!,
    schoolId,
    locationId: locationId || null,
    capacity: capacity ?? null,
    planningNotes: planningNotes || null,
    isOneOff,
    isOpenClass,
  };

  const { error } = await supabase.from("Lesson").insert(row);

  if (error) {
    console.error("createLesson error:", error);
    return { error: error.message };
  }

  const lcRows = coachIds.map((cid, i) => ({
    lessonId,
    coachId: cid,
    sortOrder: i,
  }));
  const { error: lcErr } = await supabase.from("LessonCoach").insert(lcRows);
  if (lcErr) {
    console.error("LessonCoach insert:", lcErr);
    await supabase.from("Lesson").delete().eq("id", lessonId);
    return { error: lcErr.message };
  }

  revalidatePath("/admin/turmas");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return {
    success: true,
    created: 1,
    message: isOneOff
      ? `Aula única criada para ${firstDate}.`
      : `Aula semanal registada (repete todas as semanas no dia escolhido).`,
  };
}

export type { UpdateLessonResult };

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
  const coachIdsRaw = formData.getAll("coachIds");
  const coachIds = coachIdsRaw.map((x) => String(x).trim()).filter(Boolean);
  const locationId = (formData.get("locationId") as string)?.trim() || null;
  const capacityStr = (formData.get("capacity") as string)?.trim() || null;
  const planningNotes = (formData.get("planningNotes") as string)?.trim() || null;
  const isOpenClass = formData.get("isOpenClass") === "on";
  const weekdayStr = (formData.get("weekday") as string | null)?.trim() ?? "";

  if (!lessonId || !modality || !startTime || !endTime) {
    return { error: "Preencha modalidade, hora início e hora fim." };
  }
  if (coachIds.length === 0) return { error: "Seleciona pelo menos um professor." };

  const supabase = getSupabaseForAdminWrite() ?? (await createClient());
  const { data: existingLesson } = await supabase.from("Lesson").select("isOneOff").eq("id", lessonId).maybeSingle();
  const isOneOffLesson = Boolean((existingLesson as { isOneOff?: boolean } | null)?.isOneOff);

  if (isOneOffLesson && !date) {
    return { error: "Preencha a data da aula única." };
  }
  if (!isOneOffLesson) {
    const w = parseInt(weekdayStr, 10);
    if (!Number.isInteger(w) || w < 1 || w > 7) {
      return { error: "Dia da semana inválido." };
    }
  }

  const capacity = capacityStr ? parseInt(capacityStr, 10) : null;
  if (capacityStr && (capacity === null || isNaN(capacity) || capacity < 1)) {
    return { error: "Capacidade deve ser um número positivo." };
  }

  const weekday = !isOneOffLesson ? parseInt(weekdayStr, 10) : null;

  return performUpdateLesson({
    lessonId,
    modality,
    date: isOneOffLesson ? date : undefined,
    startTime,
    endTime,
    coachIds,
    locationId,
    capacity,
    planningNotes,
    isOpenClass,
    weekday,
  });
}

export type { DeleteLessonResult };

/**
 * Remove aula única ou âncora + todas as futuras da série (recorrente).
 * UI: `POST /api/admin/turmas/delete-lesson`.
 */
export async function deleteLesson(lessonId: string, returnQuery?: string): Promise<DeleteLessonResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") {
    return { error: "Não autorizado." };
  }
  return performDeleteLesson(lessonId, returnQuery);
}
