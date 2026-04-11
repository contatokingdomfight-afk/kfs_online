import type { SupabaseClient } from "@supabase/supabase-js";
import {
  expandLessonsForDateRange,
  fetchLessonCancellations,
  rowsToLessonDefinitions,
  type ExpandedLessonRow,
  type LessonDefinitionRow,
} from "@/lib/lesson-occurrences";

export type CoachScheduleBundle = {
  defs: LessonDefinitionRow[];
  expanded: ExpandedLessonRow[];
};

/**
 * Mesma origem e fallback que a agenda do coach (`app/coach/agenda/page.tsx`):
 * aulas das escolas do professor (CoachSchool); se tiver `coachId` e não houver nenhuma aula
 * com esse professor, usa todas as aulas do conjunto (escola), como na mensagem
 * «Não tens aulas atribuídas. Mostrando todas as aulas da escola.».
 *
 * `defs` = todas as definições do âmbito (escola); `expanded` = ocorrências no intervalo já filtradas
 * pelo fallback do professor (para cartões / presenças rápidas).
 */
export async function loadCoachScheduleBundle(
  supabase: SupabaseClient,
  coachId: string | null,
  schoolId: string | null,
  rangeStart: string,
  rangeEnd: string
): Promise<CoachScheduleBundle> {
  let coachSchoolIds: string[] = [];
  if (coachId) {
    const { data: links } = await supabase.from("CoachSchool").select("schoolId").eq("coachId", coachId);
    coachSchoolIds = (links ?? []).map((l) => l.schoolId);
  }

  let effectiveSchoolId = schoolId;
  if (!effectiveSchoolId && coachSchoolIds.length === 1) {
    effectiveSchoolId = coachSchoolIds[0]!;
  }

  let allLessonsQuery = supabase
    .from("Lesson")
    .select(
      "id, modality, date, weekday, startTime, endTime, coachId, schoolId, isOneOff, isOpenClass, locationId, capacity, planningNotes"
    )
    .order("startTime", { ascending: true });

  if (coachId && coachSchoolIds.length === 0) {
    allLessonsQuery = allLessonsQuery.eq("id", "00000000-0000-0000-0000-000000000000");
  } else if (coachSchoolIds.length > 1) {
    allLessonsQuery = allLessonsQuery.in("schoolId", coachSchoolIds);
  } else if (coachSchoolIds.length === 1) {
    allLessonsQuery = allLessonsQuery.eq("schoolId", coachSchoolIds[0]!);
  } else if (effectiveSchoolId) {
    allLessonsQuery = allLessonsQuery.eq("schoolId", effectiveSchoolId);
  }

  const { data: allLessonsRaw } = await allLessonsQuery;
  const defs = rowsToLessonDefinitions(allLessonsRaw ?? []);
  const cancellations = await fetchLessonCancellations(
    supabase,
    defs.map((d) => d.id)
  );
  const fullList = expandLessonsForDateRange(defs, cancellations, rangeStart, rangeEnd);

  let expanded = fullList;
  if (coachId) {
    const myLessons = fullList.filter((l) => l.coachId === coachId);
    if (myLessons.length > 0) expanded = myLessons;
  }

  return { defs, expanded };
}
