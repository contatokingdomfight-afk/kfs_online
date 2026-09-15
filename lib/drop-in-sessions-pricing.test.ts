import { describe, expect, it } from "vitest";
import {
  calculateDropInPrice,
  DROP_IN_UNIT_PRICE_EUR,
  KINGDOM_WEEK_EXHAUSTED_BUNDLE_DISCOUNT_PERCENT,
  KINGDOM_WEEK_EXHAUSTED_BUNDLE_PRICE_EUR,
  KINGDOM_WEEK_EXHAUSTED_BUNDLE_QUANTITY,
} from "./drop-in-sessions-pricing";

describe("calculateDropInPrice", () => {
  it("cobra €10 por aula avulsa simples", () => {
    const quote = calculateDropInPrice(3, { isKingdomWeekPlan: false, weekCapExhausted: false });
    expect(quote.amountEur).toBe(30);
    expect(quote.discountPercent).toBe(0);
  });

  it("aplica pacote Week 4×€25 com 40% desconto quando o cap mensal esgotou", () => {
    const quote = calculateDropInPrice(KINGDOM_WEEK_EXHAUSTED_BUNDLE_QUANTITY, {
      isKingdomWeekPlan: true,
      weekCapExhausted: true,
    });
    expect(quote.amountEur).toBe(KINGDOM_WEEK_EXHAUSTED_BUNDLE_PRICE_EUR);
    expect(quote.listPriceEur).toBe(KINGDOM_WEEK_EXHAUSTED_BUNDLE_QUANTITY * DROP_IN_UNIT_PRICE_EUR);
    expect(quote.discountPercent).toBe(KINGDOM_WEEK_EXHAUSTED_BUNDLE_DISCOUNT_PERCENT);
    expect(quote.bundleApplied).toBe(true);
  });

  it("não aplica pacote Week se ainda há aulas base no mês", () => {
    const quote = calculateDropInPrice(4, { isKingdomWeekPlan: true, weekCapExhausted: false });
    expect(quote.amountEur).toBe(40);
    expect(quote.bundleApplied).toBe(false);
  });
});
