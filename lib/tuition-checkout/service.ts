import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { registerTuitionPaymentCore } from "@/lib/finance/register-tuition-core";
import { syncStudentPaymentStatus } from "@/lib/student-payment-status";
import { createMerchantOrder, revolutMerchantEnv, type MerchantOrder } from "@/lib/revolut/merchant";
import { currentReferenceMonthLisbon } from "@/lib/lisbon-payment-dates";
import { addMonthsToReferenceMonth } from "@/lib/reference-month";
import { resolveFamilyGroupTitularSuggestedAmount, resolvePlanMonthlyTuition } from "@/lib/family-tuition";
import { individualLoyaltyDiscount } from "@/lib/loyalty/service";
import { renewStudentInsuranceCoverage } from "@/lib/renew-student-insurance-coverage";
import { grantReferralRewardIfEligible } from "@/lib/referral-rewards";

/**
 * Pagar mensalidades em atraso pela Revolut (página segura, como na loja):
 * - o aluno escolhe os meses em «Plano e pagamentos»; ou
 * - o admin gera o link na ficha do aluno e envia-o por WhatsApp.
 * A ordem leva a referência `pc:<id do PaymentCheckout>`; o webhook marca os meses como pagos.
 */

export const CHECKOUT_REFERENCE_PREFIX = "pc:";
// Mensalidades, saída da fidelização e as taxas da adesão (inscrição e seguro).
const PAYABLE_TYPES = ["TUITION", "LOYALTY_EXIT", "ENROLLMENT", "INSURANCE"] as const;

export type LatePayment = { id: string; paymentType: string; referenceMonth: string | null; amount: number };

export async function listLatePayments(supabase: SupabaseClient, payerStudentId: string): Promise<LatePayment[]> {
  const { data } = await supabase
    .from("Payment")
    .select("id, paymentType, referenceMonth, amount")
    .eq("studentId", payerStudentId)
    .eq("status", "LATE")
    .in("paymentType", [...PAYABLE_TYPES])
    .order("referenceMonth", { ascending: true });
  return ((data ?? []) as { id: string; paymentType: string; referenceMonth: string | null; amount: number | string }[])
    .map((p) => ({ ...p, amount: Number(p.amount) }))
    .filter((p) => p.amount > 0);
}

export function latePaymentLabel(p: LatePayment): string {
  if (p.paymentType === "LOYALTY_EXIT") return "Saída da fidelização";
  if (p.paymentType === "ENROLLMENT") return "Inscrição";
  if (p.paymentType === "INSURANCE") return "Seguro desportivo";
  if (!p.referenceMonth) return "Mensalidade";
  const [y, m] = p.referenceMonth.split("-").map(Number);
  const month = new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("pt-PT", { month: "long", year: "numeric", timeZone: "UTC" });
  return `Mensalidade de ${month}`;
}

export type CheckoutResult = { url?: string; amount?: number; error?: string };

/** Cria (ou reaproveita) a ordem Revolut para os pagamentos em atraso escolhidos (todos, por omissão). */
export async function createTuitionCheckout(
  supabase: SupabaseClient,
  input: { payerStudentId: string; paymentIds?: string[]; createdByUserId: string | null; email: string | null; returnUrl: string; description: string }
): Promise<CheckoutResult> {
  const late = await listLatePayments(supabase, input.payerStudentId);
  const chosen = input.paymentIds?.length ? late.filter((p) => input.paymentIds!.includes(p.id)) : late;
  if (!chosen.length) return { error: "Não há mensalidades em atraso para pagar." };
  const ids = chosen.map((p) => p.id).sort();
  const amount = Math.round(chosen.reduce((t, p) => t + p.amount, 0) * 100) / 100;

  return openCheckout(supabase, { ...input, ids, amount });
}

/** Reaproveita a ordem aberta para o mesmo conjunto (7 dias) ou cria uma nova na Revolut. */
async function openCheckout(
  supabase: SupabaseClient,
  input: { payerStudentId: string; ids: string[]; amount: number; createdByUserId: string | null; email: string | null; returnUrl: string; description: string }
): Promise<CheckoutResult> {
  const { ids, amount } = input;
  // Mesmo conjunto ainda por pagar: reaproveita o link (evita várias ordens abertas para o mesmo).
  const { data: open } = await supabase
    .from("PaymentCheckout")
    .select("id, paymentIds, amount, checkoutUrl, environment, createdAt")
    .eq("studentId", input.payerStudentId)
    .eq("state", "PENDING")
    .order("createdAt", { ascending: false })
    .limit(5);
  const reuse = ((open ?? []) as { paymentIds: string[]; amount: number | string; checkoutUrl: string | null; environment: string; createdAt: string }[]).find(
    (c) =>
      c.checkoutUrl &&
      c.environment === revolutMerchantEnv &&
      Number(c.amount) === amount &&
      [...c.paymentIds].sort().join(",") === ids.join(",") &&
      Date.now() - new Date(c.createdAt).getTime() < 7 * 86_400_000
  );
  if (reuse?.checkoutUrl) return { url: reuse.checkoutUrl, amount };

  const id = crypto.randomUUID();
  const { error } = await supabase.from("PaymentCheckout").insert({
    id,
    studentId: input.payerStudentId,
    paymentIds: ids,
    amount,
    environment: revolutMerchantEnv,
    createdByUserId: input.createdByUserId,
  });
  if (error) return { error: "Não foi possível preparar o pagamento." };

  const order = await createMerchantOrder({
    amountEur: amount,
    description: input.description,
    reference: `${CHECKOUT_REFERENCE_PREFIX}${id}`,
    redirectUrl: input.returnUrl,
    email: input.email,
  });
  if (!order.checkout_url) return { error: "A Revolut não devolveu a página de pagamento." };
  await supabase.from("PaymentCheckout").update({ revolutOrderId: order.id, checkoutUrl: order.checkout_url }).eq("id", id);
  return { url: order.checkout_url, amount };
}

// ---------- Pagar adiantado (a mensalidade do mês seguinte, antes de ser gerada) ----------

/** Prefixo dos itens de um checkout que pagam um mês ainda sem registo de mensalidade. */
const ADVANCE_PREFIX = "month:";

/** Próximo mês por pagar a partir do mês atual (o atual, se ainda não existir mensalidade; senão o seguinte sem PAID). */
export async function nextAdvanceMonth(supabase: SupabaseClient, payerStudentId: string): Promise<string> {
  let month = currentReferenceMonthLisbon(new Date());
  const { data } = await supabase.from("Payment").select("referenceMonth, status").eq("studentId", payerStudentId).eq("paymentType", "TUITION").gte("referenceMonth", month);
  const existing = new Map(((data ?? []) as { referenceMonth: string; status: string }[]).map((p) => [p.referenceMonth, p.status]));
  for (let i = 0; i < 24 && existing.has(month); i++) month = addMonthsToReferenceMonth(month, 1);
  return month;
}

/** Valor da mensalidade desse mês: total do grupo (titular) ou plano − desconto de fidelização. */
export async function advanceMonthAmount(supabase: SupabaseClient, payerStudentId: string, familyGroupId: string | null, month: string): Promise<number> {
  if (familyGroupId) return resolveFamilyGroupTitularSuggestedAmount(supabase, familyGroupId, month);
  const { data: st } = await supabase.from("Student").select("planId").eq("id", payerStudentId).maybeSingle();
  const planId = (st as { planId?: string | null } | null)?.planId ?? null;
  if (!planId) return 0;
  const { data: plan } = await supabase.from("Plan").select("id, priceMonthly").eq("id", planId).maybeSingle();
  if (!plan) return 0;
  const base = resolvePlanMonthlyTuition(planId, Number((plan as { priceMonthly: number | string }).priceMonthly ?? 0));
  return Math.max(0, Math.round((base - (await individualLoyaltyDiscount(supabase, payerStudentId, planId, month))) * 100) / 100);
}

/** Checkout para pagar adiantado o próximo mês. O valor e o mês são sempre calculados aqui (nunca vêm do cliente). */
export async function createAdvanceTuitionCheckout(
  supabase: SupabaseClient,
  input: { payerStudentId: string; familyGroupId: string | null; createdByUserId: string | null; email: string | null; returnUrl: string }
): Promise<CheckoutResult & { month?: string }> {
  const month = await nextAdvanceMonth(supabase, input.payerStudentId);
  const amount = await advanceMonthAmount(supabase, input.payerStudentId, input.familyGroupId, month);
  if (!(amount > 0)) return { error: "Não tens um plano com mensalidade. Fala com a secretaria." };
  const res = await openCheckout(supabase, { ...input, ids: [`${ADVANCE_PREFIX}${month}`], amount, description: `Mensalidade ${month} · Kingdom Fight School` });
  return { ...res, month };
}

/** Webhook: ordem concluída com referência `pc:` → marca os pagamentos como pagos (idempotente). */
export async function markTuitionCheckoutPaid(supabase: SupabaseClient, checkoutId: string, order: MerchantOrder): Promise<boolean> {
  const { data } = await supabase.from("PaymentCheckout").select("id, studentId, paymentIds, amount, state, createdByUserId").eq("id", checkoutId).maybeSingle();
  const c = data as { id: string; studentId: string; paymentIds: string[]; amount: number | string; state: string; createdByUserId: string | null } | null;
  if (!c || c.state === "PAID") return true;
  if (order.currency !== "EUR" || order.amount !== Math.round(Number(c.amount) * 100)) {
    console.error("[tuition-checkout] valor não corresponde", { checkoutId, paid: order.amount, expected: c.amount });
    return true;
  }

  // Meses pagos adiantados (ainda sem registo): regista a mensalidade com o valor cobrado.
  const advance = c.paymentIds.filter((x) => x.startsWith(ADVANCE_PREFIX)).map((x) => x.slice(ADVANCE_PREFIX.length));
  for (const month of advance) {
    const { data: already } = await supabase.from("Payment").select("id").eq("studentId", c.studentId).eq("paymentType", "TUITION").eq("referenceMonth", month).eq("status", "PAID").maybeSingle();
    if (already) {
      console.error("[tuition-checkout] mês adiantado já estava pago", { checkoutId, month });
      continue;
    }
    const res = await registerTuitionPaymentCore(supabase, {
      studentId: c.studentId,
      amount: Math.round((Number(c.amount) / advance.length) * 100) / 100,
      referenceMonth: month,
      status: "PAID",
      tuitionMonths: 1,
      paymentMethod: "TRANSFER",
    });
    if (res.error) {
      console.error("[tuition-checkout] registar mês adiantado", res.error);
      return false;
    }
  }

  const paymentIds = c.paymentIds.filter((x) => !x.startsWith(ADVANCE_PREFIX));
  const { data: rows } = paymentIds.length ? await supabase.from("Payment").select("id, studentId, paymentType, referenceMonth, amount, status").in("id", paymentIds) : { data: [] };
  for (const p of (rows ?? []) as { id: string; studentId: string; paymentType: string; referenceMonth: string | null; amount: number | string; status: string }[]) {
    if (p.status === "PAID") continue;
    if (p.paymentType === "TUITION" && p.referenceMonth) {
      const res = await registerTuitionPaymentCore(supabase, {
        studentId: p.studentId,
        amount: Number(p.amount),
        referenceMonth: p.referenceMonth,
        status: "PAID",
        tuitionMonths: 1,
        paymentMethod: "TRANSFER",
      });
      if (res.error) {
        console.error("[tuition-checkout] registar mensalidade", res.error);
        return false;
      }
      await grantReferralRewardIfEligible(supabase, p.studentId).catch(() => undefined);
    } else {
      await supabase.from("Payment").update({ status: "PAID", paymentMethod: "TRANSFER" }).eq("id", p.id);
      // Mesmos efeitos da confirmação manual no Financeiro.
      if (p.paymentType === "ENROLLMENT") {
        await supabase.from("Student").update({ enrollmentFeeWaived: false }).eq("id", p.studentId);
      } else if (p.paymentType === "INSURANCE") {
        const actor = c.createdByUserId ?? ((await supabase.from("Student").select("userId").eq("id", p.studentId).maybeSingle()).data as { userId?: string } | null)?.userId;
        if (actor) {
          const renew = await renewStudentInsuranceCoverage(supabase, p.studentId, actor);
          if (renew.error) console.error("[tuition-checkout] renovar seguro", renew.error);
        }
      }
    }
  }
  await supabase.from("PaymentCheckout").update({ state: "PAID", paidAt: new Date().toISOString() }).eq("id", c.id);
  await syncStudentPaymentStatus(supabase, c.studentId);
  return true;
}
