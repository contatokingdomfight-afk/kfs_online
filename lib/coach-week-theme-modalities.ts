import type { SupabaseClient } from "@supabase/supabase-js";
import { getCachedModalityRefs } from "@/lib/cached-reference-data";

/**
 * Modalidades válidas para `WeekTheme`: vem do catálogo dinâmico (`ModalityRef`,
 * gerido em /admin/modalidades) — uma modalidade nova já aparece aqui sozinha,
 * sem precisar de alteração de código.
 *
 * Admin: todas as modalidades do catálogo. Coach: só modalidades em que tem
 * pelo menos uma aula (`Lesson.coachId`).
 */
export async function getModalitiesForWeekThemeEditor(
  supabase: SupabaseClient,
  userRole: string,
  coachId: string | null
): Promise<string[]> {
  const modalityRefs = await getCachedModalityRefs(supabase);
  const catalogCodes = modalityRefs.map((m) => m.code);

  if (userRole === "ADMIN") return catalogCodes;
  if (!coachId) return [];

  const { data } = await supabase.from("Lesson").select("modality").eq("coachId", coachId);
  const allowed = new Set<string>();
  for (const row of data ?? []) {
    const m = (row as { modality?: string | null }).modality;
    if (m) allowed.add(m);
  }
  return catalogCodes.filter((code) => allowed.has(code));
}
