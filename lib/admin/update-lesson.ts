import { createClient } from "@/lib/supabase/server";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { coachTeachesAtSchool } from "@/lib/coach-schools";

function getSupabaseForAdminWrite() {
  return getAdminClientOrNull().client;
}

export type UpdateLessonResult = { error?: string; success?: boolean };

export type UpdateLessonPayload = {
  lessonId: string;
  modality: string;
  date: string;
  startTime: string;
  endTime: string;
  coachId: string;
  locationId: string | null;
  capacity: number | null;
  planningNotes: string | null;
  isOpenClass: boolean;
};

export async function performUpdateLesson(payload: UpdateLessonPayload): Promise<UpdateLessonResult> {
  const {
    lessonId,
    modality,
    date,
    startTime,
    endTime,
    coachId,
    locationId,
    capacity,
    planningNotes,
    isOpenClass,
  } = payload;

  if (!lessonId?.trim() || !modality?.trim() || !date?.trim() || !startTime?.trim() || !endTime?.trim()) {
    return { error: "Preencha modalidade, data, hora início e hora fim." };
  }
  if (!coachId?.trim()) return { error: "Coach é obrigatório." };

  if (capacity !== null && (Number.isNaN(capacity) || capacity < 1)) {
    return { error: "Capacidade deve ser um número positivo." };
  }

  if (startTime >= endTime) {
    return { error: "A hora de fim deve ser posterior à hora de início." };
  }

  const supabase = getSupabaseForAdminWrite() ?? (await createClient());

  const { data: existing, error: fetchErr } = await supabase
    .from("Lesson")
    .select("id, schoolId")
    .eq("id", lessonId.trim())
    .maybeSingle();

  if (fetchErr || !existing) {
    return { error: fetchErr?.message ?? "Aula não encontrada." };
  }

  const schoolId = (existing as { schoolId: string }).schoolId;
  const teachesHere = await coachTeachesAtSchool(supabase, coachId.trim(), schoolId);
  if (!teachesHere) {
    return {
      error:
        "O coach tem de estar associado à escola desta aula. Edita o coach em Coaches e marca as escolas onde leciona.",
    };
  }

  const { error } = await supabase
    .from("Lesson")
    .update({
      modality: modality.trim(),
      date: date.trim(),
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      coachId: coachId.trim(),
      locationId: locationId || null,
      capacity,
      planningNotes: planningNotes || null,
      isOpenClass,
    })
    .eq("id", lessonId.trim());

  if (error) return { error: error.message };

  revalidatePath("/admin/turmas");
  revalidatePath(`/admin/turmas/${lessonId.trim()}`);
  revalidatePath("/coach");
  revalidatePath("/coach/agenda");
  return { success: true };
}
