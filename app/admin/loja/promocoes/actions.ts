"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { adminPermissionError } from "@/lib/permissions/assert";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeCouponCode } from "@/lib/retail/discounts";

export type PromoActionResult = { error?: string; success?: boolean };

async function allowed() {
  const u = await getCurrentDbUser();
  if (!u || u.role !== "ADMIN") return false;
  return !(await adminPermissionError("admin:financeiro:write"));
}

function refresh() {
  revalidatePath("/admin/loja/promocoes");
  revalidatePath("/admin/loja/encomendas");
  revalidatePath("/dashboard/loja", "layout");
}

const num = (v: FormDataEntryValue | null) => Number(String(v ?? "").replace(",", "."));

export async function createPromotion(_prev: PromoActionResult | null, formData: FormData): Promise<PromoActionResult> {
  if (!(await allowed())) return { error: "Não autorizado." };
  const name = String(formData.get("name") ?? "").trim();
  const productId = String(formData.get("productId") ?? "").trim() || null;
  const minQuantity = Math.round(num(formData.get("minQuantity")));
  const percentOff = num(formData.get("percentOff"));
  if (name.length < 2) return { error: "Dá um nome à promoção (ex.: «2+ camisetas»)." };
  if (!Number.isFinite(minQuantity) || minQuantity < 2) return { error: "A quantidade mínima tem de ser 2 ou mais." };
  if (!Number.isFinite(percentOff) || percentOff <= 0 || percentOff > 90) return { error: "A percentagem tem de estar entre 1 e 90." };
  const { error } = await createAdminClient().from("RetailPromotion").insert({ id: crypto.randomUUID(), name, productId, minQuantity, percentOff: percentOff.toFixed(2) });
  if (error) return { error: error.message };
  refresh();
  return { success: true };
}

export async function createCoupon(_prev: PromoActionResult | null, formData: FormData): Promise<PromoActionResult> {
  if (!(await allowed())) return { error: "Não autorizado." };
  const code = normalizeCouponCode(String(formData.get("code") ?? ""));
  const kind = String(formData.get("kind") ?? "") === "FIXED" ? "FIXED" : "PERCENT";
  const value = num(formData.get("value"));
  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return { error: "Código com 3 a 30 letras ou números (ex.: KFS10)." };
  if (!Number.isFinite(value) || value <= 0) return { error: "Indica o valor do desconto." };
  if (kind === "PERCENT" && value > 90) return { error: "Percentagem máxima: 90%." };
  const { error } = await createAdminClient().from("RetailCoupon").insert({ id: crypto.randomUUID(), code, kind, value: value.toFixed(2) });
  if (error) return { error: error.code === "23505" ? "Já existe um cupão com esse código." : error.message };
  refresh();
  return { success: true };
}

/** Liga/desliga ou apaga uma promoção ou cupão. */
export async function updateDiscount(formData: FormData): Promise<void> {
  if (!(await allowed())) return;
  const table = String(formData.get("table")) === "coupon" ? "RetailCoupon" : "RetailPromotion";
  const id = String(formData.get("id") ?? "");
  const op = String(formData.get("op") ?? "");
  const supabase = createAdminClient();
  if (op === "delete") await supabase.from(table).delete().eq("id", id);
  else await supabase.from(table).update({ isActive: op === "on", updatedAt: new Date().toISOString() }).eq("id", id);
  refresh();
}
