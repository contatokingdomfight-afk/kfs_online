/**
 * Descontos da loja (puro — corre no browser para pré-visualizar e no servidor para valer).
 * Promoção: «X% a partir de N peças» (de um produto ou da loja toda). Cupão: % ou valor fixo.
 * Numa encomenda aplica-se só o melhor dos dois.
 */

export type PromotionRule = { id: string; name: string; productId: string | null; minQuantity: number; percentOff: number };
export type CouponRule = { code: string; kind: "PERCENT" | "FIXED"; value: number };
export type DiscountLine = { productId: string; quantity: number; lineTotal: number };

export type DiscountResult = {
  subtotal: number;
  discount: number;
  total: number;
  /** Ex.: «Promoção 2+ camisetas (10%)» ou «Cupão KFS10». */
  label: string | null;
  source: "promotion" | "coupon" | null;
  promotionId: string | null;
  couponCode: string | null;
  /** Quando havia promoção e cupão, explica qual ficou. */
  note: string | null;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function normalizeCouponCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function couponLabel(c: CouponRule): string {
  return c.kind === "PERCENT" ? `${c.value}%` : `${c.value % 1 === 0 ? c.value.toFixed(0) : c.value.toFixed(2).replace(".", ",")} €`;
}

/** Melhor promoção aplicável (maior desconto). */
function bestPromotion(lines: DiscountLine[], promotions: PromotionRule[]): { rule: PromotionRule; discount: number } | null {
  let best: { rule: PromotionRule; discount: number } | null = null;
  for (const p of promotions) {
    const qualifying = lines.filter((l) => p.productId == null || l.productId === p.productId);
    const qty = qualifying.reduce((a, l) => a + l.quantity, 0);
    if (qty < p.minQuantity) continue;
    const base = qualifying.reduce((a, l) => a + l.lineTotal, 0);
    const discount = round2((base * p.percentOff) / 100);
    if (!best || discount > best.discount) best = { rule: p, discount };
  }
  return best;
}

export function computeDiscount(lines: DiscountLine[], promotions: PromotionRule[], coupon: CouponRule | null): DiscountResult {
  const subtotal = round2(lines.reduce((a, l) => a + l.lineTotal, 0));
  const promo = bestPromotion(lines, promotions);
  const couponDiscount = coupon ? round2(Math.min(subtotal, coupon.kind === "PERCENT" ? (subtotal * coupon.value) / 100 : coupon.value)) : 0;

  const none: DiscountResult = { subtotal, discount: 0, total: subtotal, label: null, source: null, promotionId: null, couponCode: null, note: null };
  if (!promo && couponDiscount <= 0) return none;

  if (promo && promo.discount >= couponDiscount) {
    return {
      subtotal,
      discount: promo.discount,
      total: round2(subtotal - promo.discount),
      label: `${promo.rule.name} (${promo.rule.percentOff}%)`,
      source: "promotion",
      promotionId: promo.rule.id,
      couponCode: null,
      note: coupon
        ? promo.discount > couponDiscount
          ? `Aplicámos a promoção, que é melhor que o cupão ${coupon.code}.`
          : `O cupão ${coupon.code} dá o mesmo desconto que a promoção — ficou a promoção.`
        : null,
    };
  }
  return {
    subtotal,
    discount: couponDiscount,
    total: round2(subtotal - couponDiscount),
    label: `Cupão ${coupon!.code} (${couponLabel(coupon!)})`,
    source: "coupon",
    promotionId: null,
    couponCode: coupon!.code,
    note: promo ? `Aplicámos o cupão ${coupon!.code}, que é melhor que a promoção.` : null,
  };
}
