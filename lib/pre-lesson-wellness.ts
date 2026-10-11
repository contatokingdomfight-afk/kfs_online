import type { SupabaseClient } from "@supabase/supabase-js";
import { computeWellnessZone, type WellnessCheckInInput, type WellnessZone } from "@/lib/wellness-score";

/** Grava (ou actualiza) o bem-estar pré-aula de um aluno para uma aula/data. Devolve a zona. */
export async function upsertPreLessonWellness(
  supabase: SupabaseClient,
  params: { studentId: string; lessonId: string; occurrenceDate: string; input: WellnessCheckInInput }
): Promise<{ zone: WellnessZone; error?: string }> {
  const { studentId, lessonId, occurrenceDate, input } = params;
  const zone = computeWellnessZone(input);

  const { data: existing } = await supabase
    .from("PreLessonWellness")
    .select("id")
    .eq("studentId", studentId)
    .eq("lessonId", lessonId)
    .eq("occurrenceDate", occurrenceDate)
    .maybeSingle();

  const row = {
    id: (existing as { id?: string } | null)?.id ?? crypto.randomUUID(),
    studentId,
    lessonId,
    occurrenceDate,
    sleepHours: input.sleepHours,
    sleepQuality: input.sleepQuality,
    hydrationOk: input.hydrationOk,
    stress: input.stress,
    fatigue: input.fatigue,
    wellnessZone: zone,
  };

  const { error } = existing
    ? await supabase.from("PreLessonWellness").update(row).eq("id", row.id)
    : await supabase.from("PreLessonWellness").insert(row);
  if (error) {
    console.error("upsertPreLessonWellness:", error.message);
    return { zone, error: error.message };
  }
  return { zone };
}

/** Zona já registada para esta aula/data (ex.: respondida na Home antes do check-in). */
export async function getPreLessonWellnessZone(
  supabase: SupabaseClient,
  params: { studentId: string; lessonId: string; occurrenceDate: string }
): Promise<WellnessZone | null> {
  const { data } = await supabase
    .from("PreLessonWellness")
    .select("wellnessZone")
    .eq("studentId", params.studentId)
    .eq("lessonId", params.lessonId)
    .eq("occurrenceDate", params.occurrenceDate)
    .maybeSingle();
  return ((data as { wellnessZone?: WellnessZone } | null)?.wellnessZone ?? null) as WellnessZone | null;
}
