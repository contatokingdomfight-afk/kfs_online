import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeCouponCode, type CouponRule, type PromotionRule } from "@/lib/retail/discounts";

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

/** Cupão ativo pelo código (sem distinção de maiúsculas). */
export async function findActiveCoupon(supabase: SupabaseClient, raw: string | null | undefined): Promise<CouponRule | null> {
  const code = normalizeCouponCode(raw ?? "");
  if (!code) return null;
  const { data } = await supabase.from("RetailCoupon").select("code, kind, value").eq("code", code).eq("isActive", true).maybeSingle();
  const c = data as { code: string; kind: "PERCENT" | "FIXED"; value: number | string } | null;
  return c ? { code: c.code, kind: c.kind, value: Number(c.value) } : null;
}
