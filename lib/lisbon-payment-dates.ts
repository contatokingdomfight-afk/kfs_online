/**
 * Datas de mensalidade em calendário civil e dias úteis (seg–sex) em Europe/Lisbon.
 */

import { formatInTimeZone, toDate } from "date-fns-tz";

export const LISBON_TZ = "Europe/Lisbon";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Fim do dia civil 10 do mês de referência (AAAA-MM), em Lisboa (23:59:59.999). */
export function endOfCalendarDay10Lisbon(referenceMonth: string): Date {
  const [y, m] = referenceMonth.split("-").map(Number);
  return toDate(`${y}-${pad2(m)}-10T23:59:59.999`, { timeZone: LISBON_TZ });
}

function isBusinessDayLisbon(year: number, month: number, day: number): boolean {
  const d = toDate(`${year}-${pad2(month)}-${pad2(day)}T12:00:00`, { timeZone: LISBON_TZ });
  const isoDow = Number(formatInTimeZone(d, LISBON_TZ, "i"));
  return isoDow >= 1 && isoDow <= 5;
}

/** Fim do 5.º dia útil do mês de referência (AAAA-MM), em Lisboa. */
export function getFifthBusinessDayEndLisbon(referenceMonth: string): Date {
  const [y, m] = referenceMonth.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  let count = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    if (!isBusinessDayLisbon(y, m, day)) continue;
    count++;
    if (count === 5) {
      return toDate(`${y}-${pad2(m)}-${pad2(day)}T23:59:59.999`, { timeZone: LISBON_TZ });
    }
  }
  throw new Error(`Mês ${referenceMonth}: não foi possível determinar o 5.º dia útil.`);
}

/**
 * Criação automática de registos LATE só após o fim do 5.º dia útil do mês,
 * ou sempre que já estamos num mês civil posterior ao de referência (recuperação).
 */
export function shouldGenerateLatePayments(now: Date, referenceMonth: string): boolean {
  const end5 = getFifthBusinessDayEndLisbon(referenceMonth);
  if (now.getTime() > end5.getTime()) return true;
  const curYm = formatInTimeZone(now, LISBON_TZ, "yyyy-MM");
  return curYm > referenceMonth;
}

export function currentReferenceMonthLisbon(now: Date): string {
  return formatInTimeZone(now, LISBON_TZ, "yyyy-MM");
}

export function previousReferenceMonthLisbon(now: Date): string {
  const [y, m] = currentReferenceMonthLisbon(now).split("-").map(Number);
  let py = y;
  let pm = m - 1;
  if (pm < 1) {
    pm = 12;
    py -= 1;
  }
  return `${py}-${pad2(pm)}`;
}
