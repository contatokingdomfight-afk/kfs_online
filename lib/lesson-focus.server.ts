import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { isLessonFocus, type LessonFocus } from "@/lib/rpe-labels";

export const focusKey = (lessonId: string, date: string) => `${lessonId}|${String(date).slice(0, 10)}`;

/**
 * Foco das aulas (por aula + dia). A tabela só é acessível pelo service role; sem cliente admin
 * (ou antes da migração) devolve vazio em vez de falhar.
 */
export async function loadLessonFocus(
  lessonIds: string[],
  fromDate: string,
  toDate: string,
  client?: SupabaseClient
): Promise<Map<string, LessonFocus[]>> {
  const out = new Map<string, LessonFocus[]>();
  const ids = [...new Set(lessonIds)];
  if (ids.length === 0) return out;
  const supabase = client ?? getAdminClientOrNull().client;
  if (!supabase) return out;
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase
      .from("LessonOccurrenceFocus")
      .select("lessonId, occurrenceDate, focus")
      .in("lessonId", ids.slice(i, i + 200))
      .gte("occurrenceDate", fromDate)
      .lte("occurrenceDate", toDate);
    if (error) return out;
    for (const r of (data ?? []) as { lessonId: string; occurrenceDate: string; focus: string[] }[]) {
      const focus = (r.focus ?? []).filter(isLessonFocus);
      if (focus.length) out.set(focusKey(r.lessonId, r.occurrenceDate), focus);
    }
  }
  return out;
}

export async function getLessonFocus(lessonId: string, date: string, client?: SupabaseClient): Promise<LessonFocus[]> {
  const m = await loadLessonFocus([lessonId], date, date, client);
  return m.get(focusKey(lessonId, date)) ?? [];
}
