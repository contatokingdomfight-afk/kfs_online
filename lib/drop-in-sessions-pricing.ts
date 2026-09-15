/** Preços comerciais de aulas avulsas / pacotes Kingdom Week (secretaria). */

export const DROP_IN_UNIT_PRICE_EUR = 10;
export const KINGDOM_WEEK_MONTHLY_PRICE_EUR = 25;
export const KINGDOM_WEEK_MONTHLY_CAP = 5;
export const KINGDOM_WEEK_EXHAUSTED_BUNDLE_QUANTITY = 4;
export const KINGDOM_WEEK_EXHAUSTED_BUNDLE_PRICE_EUR = 25;
/** Desconto face a 4 × €10 quando o aluno esgotou as 5 aulas do Week no mês. */
export const KINGDOM_WEEK_EXHAUSTED_BUNDLE_DISCOUNT_PERCENT = 40;

export type DropInPricingContext = {
  isKingdomWeekPlan: boolean;
  /** Usou todas as aulas base do Week no mês de referência. */
  weekCapExhausted: boolean;
};

export type DropInPriceQuote = {
  quantity: number;
  listPriceEur: number;
  amountEur: number;
  discountPercent: number;
  bundleApplied: boolean;
  summaryLabel: string;
};

export function isKingdomWeekMonthlyCap(maxCheckInsPerMonth: number | null | undefined): boolean {
  return maxCheckInsPerMonth === KINGDOM_WEEK_MONTHLY_CAP;
}

export function calculateDropInPrice(quantity: number, ctx: DropInPricingContext): DropInPriceQuote {
  const qty = Math.max(1, Math.floor(quantity));
  const listPriceEur = qty * DROP_IN_UNIT_PRICE_EUR;

  const bundleApplied =
    ctx.isKingdomWeekPlan &&
    ctx.weekCapExhausted &&
    qty === KINGDOM_WEEK_EXHAUSTED_BUNDLE_QUANTITY;

  if (bundleApplied) {
    return {
      quantity: qty,
      listPriceEur,
      amountEur: KINGDOM_WEEK_EXHAUSTED_BUNDLE_PRICE_EUR,
      discountPercent: KINGDOM_WEEK_EXHAUSTED_BUNDLE_DISCOUNT_PERCENT,
      bundleApplied: true,
      summaryLabel: `Pacote Week (${qty} aulas, −${KINGDOM_WEEK_EXHAUSTED_BUNDLE_DISCOUNT_PERCENT}%)`,
    };
  }

  return {
    quantity: qty,
    listPriceEur,
    amountEur: listPriceEur,
    discountPercent: 0,
    bundleApplied: false,
    summaryLabel: qty === 1 ? "1 aula avulsa" : `${qty} aulas avulsas`,
  };
}

export function formatDropInPriceEur(amount: number): string {
  return amount.toFixed(2);
}

export function amountsMatchForDropIn(expected: number, submitted: number, tolerance = 0.01): boolean {
  return Math.abs(expected - submitted) <= tolerance;
}
