import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { registerTuitionPaymentCore } from "@/lib/finance/register-tuition-core";
import { syncStudentPaymentStatus } from "@/lib/student-payment-status";
import { createMerchantOrder, revolutMerchantEnv, type MerchantOrder } from "@/lib/revolut/merchant";

/**
 * Pagar mensalidades em atraso pela Revolut (página segura, como na loja):
 * - o aluno escolhe os meses em «Plano e pagamentos»; ou
 * - o admin gera o link na ficha do aluno e envia-o por WhatsApp.
 * A ordem leva a referência `pc:<id do PaymentCheckout>`; o webhook marca os meses como pagos.
 */

export const CHECKOUT_REFERENCE_PREFIX = "pc:";
const PAYABLE_TYPES = ["TUITION", "LOYALTY_EXIT"] as const;

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

/** Webhook: ordem concluída com referência `pc:` → marca os pagamentos como pagos (idempotente). */
export async function markTuitionCheckoutPaid(supabase: SupabaseClient, checkoutId: string, order: MerchantOrder): Promise<boolean> {
  const { data } = await supabase.from("PaymentCheckout").select("id, studentId, paymentIds, amount, state").eq("id", checkoutId).maybeSingle();
  const c = data as { id: string; studentId: string; paymentIds: string[]; amount: number | string; state: string } | null;
  if (!c || c.state === "PAID") return true;
  if (order.currency !== "EUR" || order.amount !== Math.round(Number(c.amount) * 100)) {
    console.error("[tuition-checkout] valor não corresponde", { checkoutId, paid: order.amount, expected: c.amount });
    return true;
  }

  const { data: rows } = await supabase.from("Payment").select("id, studentId, paymentType, referenceMonth, amount, status").in("id", c.paymentIds);
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
    } else {
      await supabase.from("Payment").update({ status: "PAID", paymentMethod: "TRANSFER" }).eq("id", p.id);
    }
  }
  await supabase.from("PaymentCheckout").update({ state: "PAID", paidAt: new Date().toISOString() }).eq("id", c.id);
  await syncStudentPaymentStatus(supabase, c.studentId);
  return true;
}
