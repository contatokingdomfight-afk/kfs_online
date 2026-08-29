import { subDays } from "date-fns";
import { formatInTimeZone, toDate } from "date-fns-tz";
import { LISBON_TZ } from "@/lib/lisbon-payment-dates";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Segunda-feira (YYYY-MM-DD) da semana civil em **Europe/Lisbon**.
 * Usar para chaves de `WeekTheme.week_start` e leituras alinhadas ao calendário da escola
 * (o runtime em Vercel usa muitas vezes UTC: `getWeekStartMonday` local ao servidor desalinha de Portugal).
 */
export function getWeekStartMondayLisbon(now: Date = new Date()): string {
  return getWeekStartMondayForDateInLisbon(formatInTimeZone(now, LISBON_TZ, "yyyy-MM-dd"));
}

/**
 * Dada uma data civil YYYY-MM-DD (ex.: hoje em Lisboa ou `?week=`), devolve a segunda-feira
 * da mesma semana em calendário de Lisboa.
 */
export function getWeekStartMondayForDateInLisbon(ymd: string): string {
  if (!YMD.test(ymd)) {
    return getWeekStartMondayLisbon();
  }
  const instant = toDate(`${ymd}T12:00:00`, { timeZone: LISBON_TZ });
  const dowIso = parseInt(formatInTimeZone(instant, LISBON_TZ, "i"), 10);
  const monday = subDays(instant, dowIso - 1);
  return formatInTimeZone(monday, LISBON_TZ, "yyyy-MM-dd");
}

/** Dia da semana de hoje em Lisboa: Segunda=1 … Domingo=7 (igual a `Lesson.weekday`). */
export function getTodayWeekdayMon1Lisbon(now: Date = new Date()): number {
  return parseInt(formatInTimeZone(now, LISBON_TZ, "i"), 10);
}
