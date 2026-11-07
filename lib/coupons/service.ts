import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveAutoPayPayer } from "@/lib/autopay/service";
import { listLatePayments, type LatePayment } from "@/lib/tuition-checkout/service";
import {
  COUPON_SELECT,
  COUPON_TARGET_LABEL,
  couponDiscountFor,
  couponStatus,
  couponUnavailableReason,
  normalizeCouponCode,
  toCouponRow,
  type CouponRow,
  type CouponTarget,
} from "@/lib/coupons/rules";

const round2 = (n: number) => Math.round(n * 100) / 100;
const PAYMENT_TARGETS: CouponTarget[] = ["ENROLLMENT", "INSURANCE", "TUITION"];

/** Cupão pelo código: primeiro o da escola, depois um cupão antigo (sem escola, vale em todas). */
export async function findCouponByCode(supabase: SupabaseClient, raw: string | null | undefined, schoolId: string | null): Promise<CouponRow | null> {
  const code = normalizeCouponCode(raw ?? "");
  if (!code) return null;
  const { data } = await supabase.from("RetailCoupon").select(COUPON_SELECT).eq("code", code);
  const rows = ((data ?? []) as Record<string, unknown>[]).map(toCouponRow);
  if (schoolId) return rows.find((r) => r.schoolId === schoolId) ?? rows.find((r) => r.schoolId == null) ?? null;
  // Loja pública sem escola: só um cupão sem ambiguidade.
  return rows.find((r) => r.schoolId == null) ?? (rows.length === 1 ? rows[0] : null);
}

/** Nº de pessoas diferentes que já usaram cada cupão. */
export async function countCouponPeople(supabase: SupabaseClient, couponIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!couponIds.length) return out;
  const { data } = await supabase.from("CouponRedemption").select("couponId, personKey").in("couponId", couponIds);
  const sets = new Map<string, Set<string>>();
  for (const r of (data ?? []) as { couponId: string; personKey: string }[]) {
    if (!sets.has(r.couponId)) sets.set(r.couponId, new Set());
    sets.get(r.couponId)!.add(r.personKey);
  }
  for (const [id, s] of sets) out.set(id, s.size);
  return out;
}

async function personAlreadyUsed(supabase: SupabaseClient, couponId: string, personKey: string): Promise<boolean> {
  const { data } = await supabase.from("CouponRedemption").select("id").eq("couponId", couponId).eq("personKey", personKey).limit(1);
  return (data ?? []).length > 0;
}

/** Valida o cupão para quem o vai usar e onde. */
export async function checkCoupon(
  supabase: SupabaseClient,
  input: { raw: string | null | undefined; schoolId: string | null; targets: CouponTarget[]; personKey: string | null }
): Promise<{ coupon: CouponRow; error?: undefined } | { coupon?: undefined; error: string }> {
  const coupon = await findCouponByCode(supabase, input.raw, input.schoolId);
  if (!coupon) return { error: "Código inválido. Confirma se está bem escrito." };
  if (!coupon.appliesTo.some((t) => input.targets.includes(t))) {
    return { error: `Este cupão só vale para: ${coupon.appliesTo.map((t) => COUPON_TARGET_LABEL[t].toLowerCase()).join(", ")}.` };
  }
  const people = (await countCouponPeople(supabase, [coupon.id])).get(coupon.id) ?? 0;
  const reason = couponUnavailableReason(couponStatus(coupon, people), coupon);
  if (reason) return { error: reason };
  // Cupões novos (com limite de pessoas): cada pessoa usa uma vez. Os antigos da loja não tinham esta regra.
  if (coupon.maxRedemptions != null && input.personKey && (await personAlreadyUsed(supabase, coupon.id, input.personKey))) {
    return { error: "Já usaste este cupão." };
  }
  return { coupon };
}

/**
 * Pagamentos em aberto onde o aluno pode usar um cupão: os que ele próprio paga
 * (membro de família: só inscrição/seguro; a mensalidade é do titular).
 */
export async function couponEligiblePayments(supabase: SupabaseClient, studentId: string): Promise<LatePayment[]> {
  const payer = await resolveAutoPayPayer(supabase, studentId);
  const late = await listLatePayments(supabase, payer.isFamilyMember ? studentId : payer.payerStudentId);
  return late.filter((p) => PAYMENT_TARGETS.includes(p.paymentType as CouponTarget) && !(payer.isFamilyMember && p.paymentType === "TUITION"));
}

/**
 * Aplica o cupão aos pagamentos em aberto: no máximo um pagamento de cada tipo (o mais antigo).
 * Percentagem: em cada um. Valor fixo: é o total do desconto, gasto pela ordem dos pagamentos.
 * O desconto baixa o valor do pagamento; se chegar a 0 € fica pago («COUPON»).
 */
export async function applyCouponToPayments(
  supabase: SupabaseClient,
  input: { studentId: string; schoolId: string | null; raw: string; payments: LatePayment[] }
): Promise<{ error?: string; discount?: number }> {
  const types = [...new Set(input.payments.map((p) => p.paymentType as CouponTarget))];
  if (!types.length) return { error: "Não tens nada por pagar onde usar o cupão." };
  const checked = await checkCoupon(supabase, { raw: input.raw, schoolId: input.schoolId, targets: types, personKey: input.studentId });
  if (checked.error) return { error: checked.error };
  const coupon = checked.coupon!;

  const ids = input.payments.map((p) => p.id);
  const { data: used } = await supabase.from("CouponRedemption").select("paymentId").in("paymentId", ids);
  const usedIds = new Set(((used ?? []) as { paymentId: string }[]).map((r) => r.paymentId));

  const chosen: LatePayment[] = [];
  for (const t of coupon.appliesTo) {
    const p = input.payments.find((x) => x.paymentType === t && !usedIds.has(x.id));
    if (p) chosen.push(p);
  }
  if (!chosen.length) return { error: "Este cupão não se aplica a nada do que tens por pagar." };

  let budget = coupon.kind === "FIXED" ? coupon.value : Infinity;
  const plan: { p: LatePayment; discount: number }[] = [];
  for (const p of chosen) {
    const d = coupon.kind === "FIXED" ? round2(Math.min(p.amount, budget)) : couponDiscountFor(coupon, p.amount);
    if (d <= 0) continue;
    budget = round2(budget - d);
    plan.push({ p, discount: d });
  }
  if (!plan.length) return { error: "Este cupão não se aplica a nada do que tens por pagar." };

  const now = new Date().toISOString();
  const redemptionIds: string[] = [];
  for (const { p, discount } of plan) {
    const id = crypto.randomUUID();
    const { error: insErr } = await supabase.from("CouponRedemption").insert({
      id,
      couponId: coupon.id,
      schoolId: input.schoolId,
      personKey: input.studentId,
      studentId: input.studentId,
      paymentId: p.id,
      target: p.paymentType,
      originalAmount: p.amount.toFixed(2),
      discountAmount: discount.toFixed(2),
      createdAt: now,
    });
    if (insErr) continue; // já tinha cupão (corrida): fica como estava
    const left = round2(p.amount - discount);
    const patch = left <= 0 ? { amount: "0.00", status: "PAID", paymentMethod: "COUPON" } : { amount: left.toFixed(2) };
    const { error: upErr } = await supabase.from("Payment").update(patch).eq("id", p.id).eq("status", "LATE");
    if (upErr) {
      await supabase.from("CouponRedemption").delete().eq("id", id);
      continue;
    }
    redemptionIds.push(id);
  }
  if (!redemptionIds.length) return { error: "Não foi possível aplicar o cupão. Tenta outra vez." };

  // Duas pessoas ao mesmo tempo no último lugar: quem passou do limite desfaz.
  if (coupon.maxRedemptions != null) {
    const people = (await countCouponPeople(supabase, [coupon.id])).get(coupon.id) ?? 0;
    if (people > coupon.maxRedemptions) {
      await removeCouponFromPayments(supabase, { couponId: coupon.id, personKey: input.studentId });
      return { error: "Este cupão já chegou ao número máximo de pessoas." };
    }
  }
  return { discount: round2(plan.reduce((t, x) => t + x.discount, 0)) };
}

/** Tira o cupão: repõe o valor dos pagamentos que ainda não foram pagos de outra forma. */
export async function removeCouponFromPayments(supabase: SupabaseClient, input: { couponId: string; personKey: string }): Promise<{ error?: string }> {
  const { data } = await supabase
    .from("CouponRedemption")
    .select("id, paymentId, discountAmount")
    .eq("couponId", input.couponId)
    .eq("personKey", input.personKey)
    .not("paymentId", "is", null);
  const rows = (data ?? []) as { id: string; paymentId: string; discountAmount: number | string }[];
  if (!rows.length) return {};
  const { data: pays } = await supabase.from("Payment").select("id, amount, status, paymentMethod").in("id", rows.map((r) => r.paymentId));
  const byId = new Map(((pays ?? []) as { id: string; amount: number | string; status: string; paymentMethod: string | null }[]).map((p) => [p.id, p]));
  let blocked = false;
  for (const r of rows) {
    const p = byId.get(r.paymentId);
    if (!p) continue;
    const restored = round2(Number(p.amount) + Number(r.discountAmount)).toFixed(2);
    if (p.status === "LATE") {
      await supabase.from("Payment").update({ amount: restored }).eq("id", p.id).eq("status", "LATE");
    } else if (p.status === "PAID" && p.paymentMethod === "COUPON") {
      await supabase.from("Payment").update({ amount: restored, status: "LATE", paymentMethod: null }).eq("id", p.id).eq("paymentMethod", "COUPON");
    } else {
      blocked = true; // já foi pago a sério: o desconto fica
      continue;
    }
    await supabase.from("CouponRedemption").delete().eq("id", r.id);
  }
  return blocked ? { error: "Parte já foi paga, por isso esse desconto mantém-se." } : {};
}

export type AppliedCoupon = {
  couponId: string;
  code: string;
  discount: number;
  items: { paymentId: string; target: CouponTarget; originalAmount: number; discountAmount: number; covered: boolean }[];
};

/** Cupões que a pessoa tem aplicados a pagamentos ainda por pagar (ou pagos só com o cupão). */
export async function listAppliedPaymentCoupons(supabase: SupabaseClient, personKey: string): Promise<AppliedCoupon[]> {
  const { data } = await supabase
    .from("CouponRedemption")
    .select("couponId, paymentId, target, originalAmount, discountAmount")
    .eq("personKey", personKey)
    .not("paymentId", "is", null)
    .order("createdAt", { ascending: true });
  const rows = (data ?? []) as { couponId: string; paymentId: string; target: CouponTarget; originalAmount: number | string; discountAmount: number | string }[];
  if (!rows.length) return [];
  const [{ data: pays }, { data: coupons }] = await Promise.all([
    supabase.from("Payment").select("id, status, paymentMethod").in("id", rows.map((r) => r.paymentId)),
    supabase.from("RetailCoupon").select("id, code").in("id", [...new Set(rows.map((r) => r.couponId))]),
  ]);
  const payById = new Map(((pays ?? []) as { id: string; status: string; paymentMethod: string | null }[]).map((p) => [p.id, p]));
  const codeById = new Map(((coupons ?? []) as { id: string; code: string }[]).map((c) => [c.id, c.code]));
  const out = new Map<string, AppliedCoupon>();
  for (const r of rows) {
    const p = payById.get(r.paymentId);
    if (!p) continue;
    const covered = p.status === "PAID" && p.paymentMethod === "COUPON";
    if (p.status !== "LATE" && !covered) continue; // já pago: deixa de aparecer aqui
    if (!out.has(r.couponId)) out.set(r.couponId, { couponId: r.couponId, code: codeById.get(r.couponId) ?? "", discount: 0, items: [] });
    const a = out.get(r.couponId)!;
    const d = Number(r.discountAmount);
    a.discount = round2(a.discount + d);
    a.items.push({ paymentId: r.paymentId, target: r.target, originalAmount: Number(r.originalAmount), discountAmount: d, covered });
  }
  return [...out.values()];
}

/** Regista o uso na loja (depois de criada a encomenda). */
export async function recordStoreRedemption(
  supabase: SupabaseClient,
  input: { couponId: string; schoolId: string | null; personKey: string; studentId: string | null; orderId: string; subtotal: number; discount: number }
): Promise<void> {
  const { error } = await supabase.from("CouponRedemption").insert({
    id: crypto.randomUUID(),
    couponId: input.couponId,
    schoolId: input.schoolId,
    personKey: input.personKey,
    studentId: input.studentId,
    retailOrderId: input.orderId,
    target: "STORE",
    originalAmount: input.subtotal.toFixed(2),
    discountAmount: input.discount.toFixed(2),
  });
  if (error) console.warn("[cupões] uso na loja não registado:", error.message);
}
