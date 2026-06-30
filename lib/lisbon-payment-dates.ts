/**
 * Datas de mensalidade em calendário civil e dias úteis (seg–sex) em Europe/Lisbon.
 * Regra: pagamento até ao dia 8; após isso, 5 dias úteis para regularizar.
 */

import { formatInTimeZone, toDate } from "date-fns-tz";

export const LISBON_TZ = "Europe/Lisbon";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function isBusinessDayLisbon(year: number, month: number, day: number): boolean {
  const d = toDate(`${year}-${pad2(month)}-${pad2(day)}T12:00:00`, { timeZone: LISBON_TZ });
  const isoDow = Number(formatInTimeZone(d, LISBON_TZ, "i"));
  return isoDow >= 1 && isoDow <= 5;
}

/** Fim do dia civil 8 do mês de referência (prazo de pagamento), em Lisboa. */
export function endOfCalendarDay8Lisbon(referenceMonth: string): Date {
  const [y, m] = referenceMonth.split("-").map(Number);
  return toDate(`${y}-${pad2(m)}-08T23:59:59.999`, { timeZone: LISBON_TZ });
}

/** Fim do 5.º dia útil após o dia 8 (prazo de regularização). */
export function endOfGracePeriodLisbon(referenceMonth: string): Date {
  const [y, m] = referenceMonth.split("-").map(Number);
  let year = y;
  let month = m;
  let day = 9;
  let count = 0;

  while (count < 5) {
    const daysInMonth = new Date(year, month, 0).getDate();
    while (day <= daysInMonth && count < 5) {
      if (isBusinessDayLisbon(year, month, day)) {
        count++;
        if (count === 5) {
          return toDate(`${year}-${pad2(month)}-${pad2(day)}T23:59:59.999`, { timeZone: LISBON_TZ });
        }
      }
      day++;
    }
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
    day = 1;
  }

  throw new Error(`Mês ${referenceMonth}: não foi possível determinar o fim do prazo de regularização.`);
}

/** @deprecated Alias — usar endOfGracePeriodLisbon */
export function endOfCalendarDay10Lisbon(referenceMonth: string): Date {
  return endOfGracePeriodLisbon(referenceMonth);
}

/** @deprecated Alias histórico — geração LATE usa dia 8 */
export function getFifthBusinessDayEndLisbon(referenceMonth: string): Date {
  return endOfCalendarDay8Lisbon(referenceMonth);
}

/**
 * Criação automática de registos LATE só após o fim do dia 8 do mês,
 * ou sempre que já estamos num mês civil posterior ao de referência.
 */
export function shouldGenerateLatePayments(now: Date, referenceMonth: string): boolean {
  const endDue = endOfCalendarDay8Lisbon(referenceMonth);
  if (now.getTime() > endDue.getTime()) return true;
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
