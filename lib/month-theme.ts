import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type MonthThemeRow = { modality: string; title: string | null; description: string | null };

/** Tema do mês de uma modalidade (título/descrição) — fallback do WeekTheme quando a semana não tem título próprio. */
export async function getMonthThemeForModality(
  supabase: SupabaseClient,
  modality: string,
  monthStart: string
): Promise<MonthThemeRow | null> {
  const { data } = await supabase
    .from("MonthTheme")
    .select("modality, title, description")
    .eq("modality", modality)
    .eq("month_start", monthStart)
    .maybeSingle();
  return (data as MonthThemeRow | null) ?? null;
}

/** Temas do mês de todas as modalidades — usado para escolher o fallback certo no dashboard do aluno. */
export async function getMonthThemesForMonth(supabase: SupabaseClient, monthStart: string): Promise<MonthThemeRow[]> {
  const { data } = await supabase
    .from("MonthTheme")
    .select("modality, title, description")
    .eq("month_start", monthStart);
  return (data as MonthThemeRow[] | null) ?? [];
}
