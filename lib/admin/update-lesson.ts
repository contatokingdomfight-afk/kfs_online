import { createClient } from "@/lib/supabase/server";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { coachTeachesAtSchool } from "@/lib/coach-schools";
import { listFutureSeriesLessonIds } from "@/lib/admin/recurring-lesson-series";

function getSupabaseForAdminWrite() {
  return getAdminClientOrNull().client;
}

const UPDATE_CHUNK = 400;

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
  const id = lessonId.trim();

  const { data: existing, error: fetchErr } = await supabase
    .from("Lesson")
    .select("id, schoolId, isOneOff")
    .eq("id", id)
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

  const isOneOff = Boolean((existing as { isOneOff?: boolean }).isOneOff);

  const sharedFields = {
    modality: modality.trim(),
    startTime: startTime.trim(),
    endTime: endTime.trim(),
    coachId: coachId.trim(),
    locationId: locationId || null,
    capacity,
    planningNotes: planningNotes || null,
    isOpenClass,
  };

  if (isOneOff) {
    const { error } = await supabase
      .from("Lesson")
      .update({
        ...sharedFields,
        date: date.trim(),
      })
      .eq("id", id);

    if (error) return { error: error.message };
  } else {
    const series = await listFutureSeriesLessonIds(supabase, id);
    if (series.error) return { error: series.error };
    if (series.ids.length === 0) {
      return { error: "Nenhuma aula em série encontrada para atualizar." };
    }

    for (let i = 0; i < series.ids.length; i += UPDATE_CHUNK) {
      const chunk = series.ids.slice(i, i + UPDATE_CHUNK);
      const { error } = await supabase.from("Lesson").update(sharedFields).in("id", chunk);
      if (error) return { error: error.message };
    }
    // Cada ocorrência mantém o seu `date` (semana a semana); só propagamos horários, coach, modalidade, etc.
  }

  revalidatePath("/admin/turmas");
  revalidatePath(`/admin/turmas/${id}`);
  revalidatePath("/coach");
  revalidatePath("/coach/agenda");
  return { success: true };
}
