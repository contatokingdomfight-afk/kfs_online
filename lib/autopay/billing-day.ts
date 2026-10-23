/**
 * Dia de cobrança do pagamento automático: o dia do mês da 1.ª cobrança (o admin pode mudar).
 * Num mês que não tenha esse dia (ex.: 31 em novembro, 29–31 em fevereiro), cobra no último dia do mês.
 * As datas são calculadas no calendário de Lisboa e a cobrança fica marcada para as 09:00 de Lisboa.
 */

const CHARGE_HOUR_LISBON = 9;

function lisbonParts(d: Date): { y: number; m: number; day: number } {
  const s = d.toLocaleDateString("en-CA", { timeZone: "Europe/Lisbon" }); // AAAA-MM-DD
  const [y, m, day] = s.split("-").map(Number);
  return { y, m, day };
}

/** Diferença (em horas) entre Lisboa e UTC nesse instante: 0 no inverno, 1 no verão. */
function lisbonOffsetHours(d: Date): number {
  const hour = Number(d.toLocaleString("en-GB", { timeZone: "Europe/Lisbon", hour: "2-digit", hour12: false }));
  return (hour - d.getUTCHours() + 24) % 24;
}

export function daysInMonth(year: number, month1to12: number): number {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}

/** Dia efetivo num mês: o dia escolhido ou o último dia, se o mês for mais curto. */
export function effectiveBillingDay(billingDay: number, year: number, month1to12: number): number {
  return Math.min(Math.max(1, Math.trunc(billingDay)), daysInMonth(year, month1to12));
}

/** Instante da cobrança (09:00 de Lisboa) nesse ano/mês. */
export function chargeInstant(billingDay: number, year: number, month1to12: number): Date {
  const day = effectiveBillingDay(billingDay, year, month1to12);
  const guess = new Date(Date.UTC(year, month1to12 - 1, day, CHARGE_HOUR_LISBON));
  return new Date(guess.getTime() - lisbonOffsetHours(guess) * 3_600_000);
}

/** Próxima data de cobrança estritamente depois de `after` (por omissão, agora). */
export function nextChargeAfter(billingDay: number, after: Date = new Date()): Date {
  const { y, m } = lisbonParts(after);
  const thisMonth = chargeInstant(billingDay, y, m);
  if (thisMonth.getTime() > after.getTime()) return thisMonth;
  return m === 12 ? chargeInstant(billingDay, y + 1, 1) : chargeInstant(billingDay, y, m + 1);
}

/** Dia de cobrança a partir da data da 1.ª cobrança (dia do calendário de Lisboa). */
export function billingDayFrom(firstCharge: Date): number {
  return lisbonParts(firstCharge).day;
}

/** Mesmo dia no calendário de Lisboa? (para decidir se a data na Revolut precisa de correção). */
export function sameLisbonDay(a: Date, b: Date): boolean {
  const pa = lisbonParts(a);
  const pb = lisbonParts(b);
  return pa.y === pb.y && pa.m === pb.m && pa.day === pb.day;
}

/** «23» → «dia 23 de cada mês»; 29–31 avisa que nos meses mais curtos é no último dia. */
export function billingDayLabel(billingDay: number): string {
  return billingDay >= 29 ? `dia ${billingDay} (ou o último dia, nos meses mais curtos)` : `dia ${billingDay} de cada mês`;
}
