import type { SupabaseClient } from "@supabase/supabase-js";

/** Modalidades válidas para `WeekTheme` (alinhado com tema-semana e Student). */
export const WEEK_THEME_MODALITIES = ["MUAY_THAI", "BOXING", "KICKBOXING", "MMA"] as const;

/**
 * Admin: todas as modalidades. Coach: só modalidades em que tem pelo menos uma aula (`Lesson.coachId`).
 */
export async function getModalitiesForWeekThemeEditor(
  supabase: SupabaseClient,
  userRole: string,
  coachId: string | null
): Promise<string[]> {
  if (userRole === "ADMIN") return [...WEEK_THEME_MODALITIES];
  if (!coachId) return [];
  const { data } = await supabase.from("Lesson").select("modality").eq("coachId", coachId);
  const allowed = new Set<string>();
  for (const row of data ?? []) {
    const m = (row as { modality?: string | null }).modality;
    if (m && (WEEK_THEME_MODALITIES as readonly string[]).includes(m)) allowed.add(m);
  }
  return WEEK_THEME_MODALITIES.filter((m) => allowed.has(m));
}
