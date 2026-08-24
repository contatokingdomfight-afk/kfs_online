/**
 * Datas de mensalidade em calendário civil em Europe/Lisbon.
 * Regra: pagamento até ao dia 8; após isso, 15 dias corridos para regularizar.
 */

import { formatInTimeZone, toDate } from "date-fns-tz";

export const LISBON_TZ = "Europe/Lisbon";

/** Dias corridos de tolerância após o dia 8 antes de suspender o plano. */
export const GRACE_PERIOD_DAYS = 15;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Fim do dia civil 8 do mês de referência (prazo de pagamento), em Lisboa. */
export function endOfCalendarDay8Lisbon(referenceMonth: string): Date {
  const [y, m] = referenceMonth.split("-").map(Number);
  return toDate(`${y}-${pad2(m)}-08T23:59:59.999`, { timeZone: LISBON_TZ });
}

/**
 * Fim do prazo de regularização (dia 8 + 15 dias corridos), em Lisboa.
 * Nota: assume que dia 8 + GRACE_PERIOD_DAYS ≤ 28, para ser válido em qualquer mês
 * (incluindo fevereiro) sem lógica de transbordo de mês.
 */
export function endOfGracePeriodLisbon(referenceMonth: string): Date {
  const [y, m] = referenceMonth.split("-").map(Number);
  const day = 8 + GRACE_PERIOD_DAYS;
  return toDate(`${y}-${pad2(m)}-${pad2(day)}T23:59:59.999`, { timeZone: LISBON_TZ });
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
