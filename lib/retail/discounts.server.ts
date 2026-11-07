import type { SupabaseClient } from "@supabase/supabase-js";
import type { CouponRule, PromotionRule } from "@/lib/retail/discounts";
import { checkCoupon } from "@/lib/coupons/service";

export async function loadActivePromotions(supabase: SupabaseClient): Promise<PromotionRule[]> {
  const { data } = await supabase.from("RetailPromotion").select("id, name, productId, minQuantity, percentOff").eq("isActive", true);
  return ((data ?? []) as { id: string; name: string; productId: string | null; minQuantity: number; percentOff: number | string }[]).map((p) => ({
    id: p.id,
    name: p.name,
    productId: p.productId,
    minQuantity: Number(p.minQuantity),
    percentOff: Number(p.percentOff),
  }));
}

/** Cupão válido na loja para esta escola/pessoa (sem distinção de maiúsculas). */
export async function checkStoreCoupon(
  supabase: SupabaseClient,
  raw: string | null | undefined,
  ctx: { schoolId: string | null; personKey: string | null }
): Promise<{ coupon?: CouponRule; error?: string }> {
  const r = await checkCoupon(supabase, { raw, schoolId: ctx.schoolId, targets: ["STORE"], personKey: ctx.personKey });
  if (r.error || !r.coupon) return { error: r.error ?? "Cupão inválido." };
  return { coupon: { id: r.coupon.id, code: r.coupon.code, kind: r.coupon.kind, value: r.coupon.value } };
}
