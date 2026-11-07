"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { adminPermissionError } from "@/lib/permissions/assert";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAccessSchool, getSchoolScope, isNetworkScope, schoolIdForNewRecord } from "@/lib/school-scope";
import { COUPON_TARGETS, normalizeCouponCode, type CouponTarget } from "@/lib/coupons/rules";

export type CouponAdminResult = { error?: string; success?: boolean };

async function allowedUser() {
  const u = await getCurrentDbUser();
  if (!u || u.role !== "ADMIN") return null;
  return (await adminPermissionError("admin:financeiro:write")) ? null : u;
}

function refresh() {
  revalidatePath("/admin/financeiro/cupoes");
  revalidatePath("/admin/loja/promocoes");
}

const num = (v: FormDataEntryValue | null) => Number(String(v ?? "").replace(",", "."));

/** «2026-10-31» → início/fim do dia em Lisboa (aprox. pelo fuso do servidor). */
function dayIso(v: FormDataEntryValue | null, end: boolean): string | null {
  const s = String(v ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return new Date(`${s}T${end ? "23:59:59" : "00:00:00"}`).toISOString();
}

export async function createCouponAdmin(_prev: CouponAdminResult | null, formData: FormData): Promise<CouponAdminResult> {
  const u = await allowedUser();
  if (!u) return { error: "Não autorizado." };
  const school = await schoolIdForNewRecord();
  if (school.error) return { error: school.error };

  const code = normalizeCouponCode(String(formData.get("code") ?? ""));
  const name = String(formData.get("name") ?? "").trim().slice(0, 80) || null;
  const kind = String(formData.get("kind") ?? "") === "FIXED" ? "FIXED" : "PERCENT";
  const value = num(formData.get("value"));
  const appliesTo = formData.getAll("appliesTo").map(String).filter((t): t is CouponTarget => (COUPON_TARGETS as readonly string[]).includes(t));
  const maxRedemptions = Math.round(num(formData.get("maxRedemptions")));
  const startsAt = dayIso(formData.get("startsAt"), false);
  const endsAt = dayIso(formData.get("endsAt"), true);

  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return { error: "Código com 3 a 30 letras, números, - ou _ (ex.: OUTUBROROSA)." };
  if (!Number.isFinite(value) || value <= 0) return { error: "Indica o valor do desconto." };
  if (kind === "PERCENT" && value > 100) return { error: "A percentagem vai até 100%." };
  if (!appliesTo.length) return { error: "Escolhe onde o cupão se aplica." };
  if (!Number.isFinite(maxRedemptions) || maxRedemptions < 1) return { error: "Indica o número máximo de pessoas (1 ou mais)." };
  if (startsAt && endsAt && endsAt < startsAt) return { error: "A data de fim é antes da data de início." };

  const { error } = await createAdminClient()
    .from("RetailCoupon")
    .insert({
      id: crypto.randomUUID(),
      code,
      name,
      kind,
      value: value.toFixed(2),
      schoolId: school.schoolId,
      appliesTo,
      maxRedemptions,
      startsAt,
      endsAt,
      createdByUserId: u.id,
    });
  if (error) return { error: error.code === "23505" ? "Já existe um cupão com esse código nesta escola." : error.message };
  refresh();
  return { success: true };
}

/** Pausar, retomar, encerrar ou apagar (só se nunca foi usado). */
export async function updateCouponAdmin(formData: FormData): Promise<void> {
  if (!(await allowedUser())) return;
  const id = String(formData.get("id") ?? "");
  const op = String(formData.get("op") ?? "");
  const supabase = createAdminClient();
  const { data } = await supabase.from("RetailCoupon").select("id, code, schoolId").eq("id", id).maybeSingle();
  const c = data as { id: string; code: string; schoolId: string | null } | null;
  if (!c) return;
  const scope = await getSchoolScope();
  // Cupões antigos (sem escola) só o Admin Geral mexe.
  if (c.schoolId ? !canAccessSchool(scope, c.schoolId) : !isNetworkScope(scope)) return;

  const now = new Date().toISOString();
  if (op === "pause") await supabase.from("RetailCoupon").update({ isActive: false, updatedAt: now }).eq("id", id);
  else if (op === "resume") await supabase.from("RetailCoupon").update({ isActive: true, updatedAt: now }).eq("id", id);
  else if (op === "end") await supabase.from("RetailCoupon").update({ endedAt: now, isActive: false, updatedAt: now }).eq("id", id);
  else if (op === "delete") {
    const [{ count: uses }, { count: orders }] = await Promise.all([
      supabase.from("CouponRedemption").select("id", { count: "exact", head: true }).eq("couponId", id),
      supabase.from("RetailOrder").select("id", { count: "exact", head: true }).eq("couponCode", c.code),
    ]);
    if ((uses ?? 0) > 0 || (orders ?? 0) > 0) return; // já usado: encerra-se, não se apaga
    await supabase.from("RetailCoupon").delete().eq("id", id);
  }
  refresh();
}
