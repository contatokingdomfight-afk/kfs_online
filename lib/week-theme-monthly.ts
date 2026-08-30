import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getWeekStartMondayForDateInLisbon } from "@/lib/lisbon-week";

export function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function getMonthRange(yearMonth: string): { start: string; end: string; label: string } {
  const [year, month] = yearMonth.split("-").map(Number);
  /** Dias no mês via getters locais (sem passar por toISOString, que desvia a data em fusos UTC+N como Lisboa no horário de verão). */
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthStr = String(month).padStart(2, "0");
  const start = `${year}-${monthStr}-01`;
  const end = `${year}-${monthStr}-${String(daysInMonth).padStart(2, "0")}`;
  const label = new Date(year, month - 1, 1).toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
  return {
    start,
    end,
    label: label.charAt(0).toUpperCase() + label.slice(1),
  };
}

function addWeeks(weekStart: string, delta: number): string {
  const [y, m, d] = weekStart.split("-").map(Number);
  const d2 = new Date(y, m - 1, d);
  d2.setDate(d2.getDate() + delta * 7);
  return `${d2.getFullYear()}-${String(d2.getMonth() + 1).padStart(2, "0")}-${String(d2.getDate()).padStart(2, "0")}`;
}

function formatWeekLabel(weekStart: string, locale: "pt" | "en"): string {
  const [y, m, d] = weekStart.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const loc = locale === "en" ? "en-GB" : "pt-PT";
  return (
    start.toLocaleDateString(loc, { day: "2-digit", month: "short" }) +
    " – " +
    end.toLocaleDateString(loc, { day: "2-digit", month: "short", year: "numeric" })
  );
}

/** Segundas-feiras (week_start) cuja semana (Seg-Dom) toca o mês dado. */
export function getMonthWeekStarts(yearMonth: string): string[] {
  const { start, end } = getMonthRange(yearMonth);
  const firstWeekStart = getWeekStartMondayForDateInLisbon(start);
  const weekStarts: string[] = [];
  let cursor = firstWeekStart;
  while (cursor <= end) {
    weekStarts.push(cursor);
    cursor = addWeeks(cursor, 1);
  }
  return weekStarts;
}

export type WeekThemeMonthlyRow = {
  weekStart: string;
  label: string;
  days: Partial<Record<number, string>>;
};

/** Grade mensal (uma linha por semana do mês) do detalhe diário de uma modalidade. */
export async function loadWeekThemeMonthlyGrid(
  supabase: SupabaseClient,
  modality: string,
  yearMonth: string,
  locale: "pt" | "en" = "pt"
): Promise<WeekThemeMonthlyRow[]> {
  const weekStarts = getMonthWeekStarts(yearMonth);
  if (weekStarts.length === 0) return [];

  const { data } = await supabase
    .from("WeekThemeDay")
    .select("week_start, weekday, topic")
    .eq("modality", modality)
    .in("week_start", weekStarts);

  const daysByWeek = new Map<string, Partial<Record<number, string>>>();
  for (const row of (data as { week_start: string; weekday: number; topic: string }[] | null) ?? []) {
    const days = daysByWeek.get(row.week_start) ?? {};
    days[row.weekday] = row.topic;
    daysByWeek.set(row.week_start, days);
  }

  return weekStarts.map((weekStart) => ({
    weekStart,
    label: formatWeekLabel(weekStart, locale),
    days: daysByWeek.get(weekStart) ?? {},
  }));
}
