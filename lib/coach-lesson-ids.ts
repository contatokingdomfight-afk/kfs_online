import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * IDs de aulas em que o professor é titular (`Lesson.coachId`) ou está em `LessonCoach`.
 * Alinha o âmbito com o que o coach pode abrir em Presenças na aula (vs. filtrar só por `coachId` na Lesson).
 */
export async function getLessonIdsForCoach(supabase: SupabaseClient, coachId: string | null): Promise<Set<string>> {
  const ids = new Set<string>();
  if (!coachId) return ids;
  const [{ data: primary }, { data: linked }] = await Promise.all([
    supabase.from("Lesson").select("id").eq("coachId", coachId),
    supabase.from("LessonCoach").select("lessonId").eq("coachId", coachId),
  ]);
  for (const r of primary ?? []) ids.add(String((r as { id: string }).id));
  for (const r of linked ?? []) ids.add(String((r as { lessonId: string }).lessonId));
  return ids;
}
