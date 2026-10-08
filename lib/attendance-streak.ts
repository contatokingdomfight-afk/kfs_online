import { isoWeekKey } from "@/lib/tribe-lesson-photos";

/** Segunda-feira (yyyy-MM-dd) da semana de uma data civil. */
function mondayOf(ymd: string): string {
  const [y, m, d] = ymd.slice(0, 10).split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

/**
 * Semanas seguidas (semana ISO, segunda a domingo) com pelo menos uma presença confirmada,
 * a contar para trás a partir da semana actual. Se esta semana ainda não tem presença, começa
 * na anterior — a sequência só se perde quando uma semana inteira passa sem treino.
 */
export function weeksInARow(confirmedDates: string[], todayYmd: string): number {
  const weeks = new Set(confirmedDates.map((d) => isoWeekKey(d)));
  let cursor = mondayOf(todayYmd);
  if (!weeks.has(isoWeekKey(cursor))) cursor = addDays(cursor, -7);
  let count = 0;
  while (weeks.has(isoWeekKey(cursor))) {
    count++;
    cursor = addDays(cursor, -7);
  }
  return count;
}

export type WeekDayMark = {
  ymd: string;
  /** Inicial do dia (S, T, Q, Q, S, S, D em PT). */
  label: string;
  isToday: boolean;
  /** Check-in confirmado nesse dia. */
  trained: boolean;
  /** «Vou» marcado (ainda sem check-in). */
  going: boolean;
};

/** Os 7 dias (segunda a domingo) da semana de `todayYmd`, com treinos e «Vou» marcados. */
export function weekDayMarks(
  todayYmd: string,
  confirmedDates: string[],
  goingDates: string[],
  locale: "pt" | "en"
): WeekDayMark[] {
  const labels = locale === "pt" ? ["S", "T", "Q", "Q", "S", "S", "D"] : ["M", "T", "W", "T", "F", "S", "S"];
  const trained = new Set(confirmedDates.map((d) => d.slice(0, 10)));
  const going = new Set(goingDates.map((d) => d.slice(0, 10)));
  const monday = mondayOf(todayYmd);
  return labels.map((label, i) => {
    const ymd = addDays(monday, i);
    return { ymd, label, isToday: ymd === todayYmd, trained: trained.has(ymd), going: !trained.has(ymd) && going.has(ymd) };
  });
}
