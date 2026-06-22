import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Modalidades em que o coach tem pelo menos uma aula (`Lesson.coachId`).
 * Ordem alinhada com `ModalityRef.sortOrder`.
 */
export async function getCoachLessonModalities(
  supabase: SupabaseClient,
  coachId: string
): Promise<string[]> {
  const [{ data: lessons }, { data: refs }] = await Promise.all([
    supabase.from("Lesson").select("modality").eq("coachId", coachId),
    supabase.from("ModalityRef").select("code, sortOrder").order("sortOrder", { ascending: true }),
  ]);

  const fromLessons = new Set<string>();
  for (const row of lessons ?? []) {
    const m = (row as { modality?: string | null }).modality;
    if (m) fromLessons.add(m);
  }

  return (refs ?? [])
    .map((r) => (r as { code: string }).code)
    .filter((code) => fromLessons.has(code));
}
