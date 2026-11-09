/**
 * Datas de mensalidade em calendário civil em Europe/Lisbon.
 * Regra: mensalidade gerada no dia 1; prazo = dia de pagamento do aluno (Student.paymentDueDay,
 * por omissão 5); depois disso, 15 dias corridos para regularizar antes de suspender.
 */

import { formatInTimeZone, toDate } from "date-fns-tz";

export const LISBON_TZ = "Europe/Lisbon";

/** Dia de pagamento por omissão (Student.paymentDueDay). */
export const DEFAULT_PAYMENT_DUE_DAY = 5;

/** Dias corridos de tolerância após o dia de pagamento antes de suspender o plano. */
export const GRACE_PERIOD_DAYS = 15;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Normaliza o dia de pagamento para 1–28 (válido em qualquer mês). */
export function normalizeDueDay(dueDay: number | null | undefined): number {
  const d = Math.trunc(Number(dueDay ?? DEFAULT_PAYMENT_DUE_DAY));
  if (!Number.isFinite(d)) return DEFAULT_PAYMENT_DUE_DAY;
  return Math.min(28, Math.max(1, d));
}

/** Fim do dia de pagamento do mês de referência, em Lisboa. */
export function endOfDueDayLisbon(referenceMonth: string, dueDay: number = DEFAULT_PAYMENT_DUE_DAY): Date {
  const [y, m] = referenceMonth.split("-").map(Number);
  return toDate(`${y}-${pad2(m)}-${pad2(normalizeDueDay(dueDay))}T23:59:59.999`, { timeZone: LISBON_TZ });
}

/** @deprecated Usar endOfDueDayLisbon(referenceMonth, dueDay). */
export function endOfCalendarDay8Lisbon(referenceMonth: string): Date {
  return endOfDueDayLisbon(referenceMonth, 8);
}

/** Fim do prazo de regularização (dia de pagamento + 15 dias corridos), em Lisboa. */
export function endOfGracePeriodLisbon(referenceMonth: string, dueDay: number = DEFAULT_PAYMENT_DUE_DAY): Date {
  const [y, m] = referenceMonth.split("-").map(Number);
  // Date.UTC trata o transbordo de mês (ex.: dia 28 + 15).
  const d = new Date(Date.UTC(y, m - 1, normalizeDueDay(dueDay) + GRACE_PERIOD_DAYS));
  const ymd = `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
  return toDate(`${ymd}T23:59:59.999`, { timeZone: LISBON_TZ });
}

/** A mensalidade desse mês já passou do dia de pagamento (está em atraso se não paga)? */
export function isPastDueDay(now: Date, referenceMonth: string, dueDay: number = DEFAULT_PAYMENT_DUE_DAY): boolean {
  if (now.getTime() > endOfDueDayLisbon(referenceMonth, dueDay).getTime()) return true;
  return formatInTimeZone(now, LISBON_TZ, "yyyy-MM") > referenceMonth;
}

/**
 * Pode gerar a mensalidade (registo por pagar) desse mês? Sim a partir do dia 1 do mês.
 * O atraso conta-se à parte, pelo dia de pagamento de cada aluno (isPastDueDay).
 */
export function shouldGenerateLatePayments(now: Date, referenceMonth: string): boolean {
  return formatInTimeZone(now, LISBON_TZ, "yyyy-MM") >= referenceMonth;
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

/** Data civil de hoje em Lisboa (YYYY-MM-DD). */
export function todayYmdLisbon(now: Date = new Date()): string {
  return formatInTimeZone(now, LISBON_TZ, "yyyy-MM-dd");
}
