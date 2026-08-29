import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

type WeekThemeDayRow = { modality: string; weekday: number; topic: string };

/**
 * Substitui as linhas de `WeekThemeDay` de uma semana+modalidade: apaga tudo e
 * insere só os dias com texto não-vazio. Sem linha = sem tema nesse dia.
 */
export async function replaceWeekThemeDays(
  supabase: SupabaseClient,
  modality: string,
  weekStart: string,
  topicsByWeekday: Record<number, string>
): Promise<{ error?: string }> {
  const { error: deleteError } = await supabase
    .from("WeekThemeDay")
    .delete()
    .eq("modality", modality)
    .eq("week_start", weekStart);

  if (deleteError) {
    return { error: deleteError.message };
  }

  const rows = Object.entries(topicsByWeekday)
    .map(([weekday, topic]) => ({ weekday: Number(weekday), topic: topic.trim() }))
    .filter((r) => r.weekday >= 1 && r.weekday <= 7 && r.topic.length > 0)
    .map((r) => ({ modality, week_start: weekStart, weekday: r.weekday, topic: r.topic }));

  if (rows.length === 0) return {};

  const { error: insertError } = await supabase.from("WeekThemeDay").insert(rows);
  if (insertError) return { error: insertError.message };

  return {};
}

/** Linhas de `WeekThemeDay` de uma semana, opcionalmente filtradas por modalidade. */
export async function getWeekThemeDaysForWeek(
  supabase: SupabaseClient,
  weekStart: string,
  modality?: string
): Promise<WeekThemeDayRow[]> {
  let query = supabase
    .from("WeekThemeDay")
    .select("modality, weekday, topic")
    .eq("week_start", weekStart);

  if (modality) query = query.eq("modality", modality);

  const { data } = await query;
  return (data as WeekThemeDayRow[] | null) ?? [];
}
