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
  /** Aula única: obrigatório. Recorrente: ignorado. */
  date?: string;
  startTime: string;
  endTime: string;
  /** Pelo menos um; o primeiro fica em `Lesson.coachId` (compat). */
  coachIds: string[];
  locationId: string | null;
  capacity: number | null;
  planningNotes: string | null;
  isOpenClass: boolean;
  /** Recorrente: 1–7. */
  weekday?: number | null;
};

export async function performUpdateLesson(payload: UpdateLessonPayload): Promise<UpdateLessonResult> {
  const {
    lessonId,
    modality,
    date,
    startTime,
    endTime,
    coachIds,
    locationId,
    capacity,
    planningNotes,
    isOpenClass,
    weekday,
  } = payload;

  const coachList = (coachIds ?? []).map((c) => c.trim()).filter(Boolean);

  if (!lessonId?.trim() || !modality?.trim() || !startTime?.trim() || !endTime?.trim()) {
    return { error: "Preencha modalidade, hora início e hora fim." };
  }
  if (coachList.length === 0) return { error: "Seleciona pelo menos um professor." };

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
  for (const cid of coachList) {
    const teachesHere = await coachTeachesAtSchool(supabase, cid, schoolId);
    if (!teachesHere) {
      return {
        error:
          "Todos os professores têm de estar associados à escola desta aula. Edita o coach em Coaches e marca as escolas onde leciona.",
      };
    }
  }
  const primaryCoachId = coachList[0]!;

  const isOneOff = Boolean((existing as { isOneOff?: boolean }).isOneOff);

  if (isOneOff && !date?.trim()) {
    return { error: "Preencha a data da aula única." };
  }

  if (!isOneOff) {
    const wd = weekday;
    if (wd == null || !Number.isInteger(wd) || wd < 1 || wd > 7) {
      return { error: "Dia da semana inválido (1–7)." };
    }
  }

  const sharedFields: Record<string, unknown> = {
    modality: modality.trim(),
    startTime: startTime.trim(),
    endTime: endTime.trim(),
    coachId: primaryCoachId,
    locationId: locationId || null,
    capacity,
    planningNotes: planningNotes || null,
    isOpenClass,
  };

  if (isOneOff) {
    sharedFields.date = (date ?? "").trim();
    sharedFields.weekday = null;
  } else {
    sharedFields.date = null;
    sharedFields.weekday = weekday;
  }

  const { error } = await supabase.from("Lesson").update(sharedFields).eq("id", id);

  if (error) return { error: error.message };

  await supabase.from("LessonCoach").delete().eq("lessonId", id);
  const lcRows = coachList.map((cid, i) => ({
    lessonId: id,
    coachId: cid,
    sortOrder: i,
  }));
  const { error: lcErr } = await supabase.from("LessonCoach").insert(lcRows);
  if (lcErr) return { error: lcErr.message };

  revalidatePath("/admin/turmas");
  revalidatePath(`/admin/turmas/${id}`);
  revalidatePath("/coach");
  revalidatePath("/coach/agenda");
  revalidatePath("/dashboard");
  return { success: true };
}
