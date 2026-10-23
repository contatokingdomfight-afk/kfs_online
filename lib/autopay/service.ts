import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getFamilyContext } from "@/lib/family-group";
import { resolveFamilyGroupTitularSuggestedAmount, resolvePlanMonthlyTuition } from "@/lib/family-tuition";
import { registerTuitionPaymentCore } from "@/lib/finance/register-tuition-core";
import { currentReferenceMonthLisbon } from "@/lib/lisbon-payment-dates";
import { addMonthsToReferenceMonth } from "@/lib/reference-month";
import { createInAppNotification } from "@/lib/notifications/in-app";
import { individualLoyaltyDiscount } from "@/lib/loyalty/service";
import {
  cancelMerchantSubscription,
  changeMerchantSubscriptionPlan,
  changeMerchantSubscriptionRenewalDate,
  createMerchantCustomer,
  createMerchantSubscription,
  createMonthlySubscriptionPlan,
  getMerchantOrder,
  getMerchantSubscription,
  listMerchantSubscriptionCycles,
  paymentMethodLabel,
  revolutMerchantEnv,
  type MerchantOrder,
} from "@/lib/revolut/merchant";
import { billingDayFrom, nextChargeAfter, sameLisbonDay } from "./billing-day";

/**
 * Pagamento automático da mensalidade (Subscrições Revolut).
 * - Pagador: o aluno, ou o titular do grupo familiar (paga o total do grupo).
 * - A cobrança do ciclo N paga o mês `firstReferenceMonth + N-1` (determinístico: dois syncs em paralelo
 *   nunca atribuem a mesma cobrança a meses diferentes).
 * - Sem eventos de renovação na Revolut: o estado vem de `syncAutoPay` (webhook de ordem/subscrição,
 *   regresso do aluno e cron diário).
 */

export type AutoPayState = "PENDING" | "ACTIVE" | "OVERDUE" | "CANCELLED";

export type AutoPayRow = {
  id: string;
  studentId: string;
  familyGroupId: string | null;
  environment: string;
  state: AutoPayState;
  amount: number;
  billingDay: number | null;
  firstReferenceMonth: string | null;
  revolutCustomerId: string | null;
  revolutSubscriptionId: string | null;
  revolutPlanVariationId: string | null;
  setupOrderId: string | null;
  paymentMethodLabel: string | null;
  nextChargeAt: string | null;
  lastReminderFor: string | null;
  activatedAt: string | null;
  cancelledAt: string | null;
  lastSyncedAt: string | null;
};

const COLUMNS =
  'id, studentId, familyGroupId, environment, state, amount, billingDay, firstReferenceMonth, revolutCustomerId, revolutSubscriptionId, revolutPlanVariationId, setupOrderId, paymentMethodLabel, nextChargeAt, lastReminderFor, activatedAt, cancelledAt, lastSyncedAt';

function normalize(r: Record<string, unknown>): AutoPayRow {
  return { ...(r as AutoPayRow), amount: Number(r.amount ?? 0), billingDay: r.billingDay == null ? null : Number(r.billingDay) };
}

export async function loadAutoPayForStudent(supabase: SupabaseClient, studentId: string): Promise<AutoPayRow | null> {
  const { data, error } = await supabase.from("AutoPay").select(COLUMNS).eq("studentId", studentId).maybeSingle();
  if (error || !data) return null;
  return normalize(data as Record<string, unknown>);
}

export async function loadAutoPayBy(supabase: SupabaseClient, field: "revolutSubscriptionId" | "setupOrderId" | "revolutCustomerId", value: string): Promise<AutoPayRow[]> {
  const { data } = await supabase.from("AutoPay").select(COLUMNS).eq(field, value);
  return ((data ?? []) as Record<string, unknown>[]).map(normalize);
}

export async function loadAutoPayToSync(supabase: SupabaseClient): Promise<AutoPayRow[]> {
  const { data } = await supabase.from("AutoPay").select(COLUMNS).in("state", ["PENDING", "ACTIVE", "OVERDUE"]).eq("environment", revolutMerchantEnv);
  return ((data ?? []) as Record<string, unknown>[]).map(normalize);
}

/** Quem paga a mensalidade deste aluno: ele próprio ou o titular do grupo familiar. */
export async function resolveAutoPayPayer(
  supabase: SupabaseClient,
  studentId: string
): Promise<{ payerStudentId: string; familyGroupId: string | null; isFamilyMember: boolean }> {
  const ctx = await getFamilyContext(supabase, studentId);
  if (!ctx) return { payerStudentId: studentId, familyGroupId: null, isFamilyMember: false };
  return { payerStudentId: ctx.billingStudentId, familyGroupId: ctx.group.id, isFamilyMember: !ctx.isTitular };
}

/** Valor mensal a cobrar: total do grupo familiar (titular) ou mensalidade do plano do aluno. */
export async function expectedMonthlyAmount(supabase: SupabaseClient, payerStudentId: string, familyGroupId: string | null): Promise<number> {
  if (familyGroupId) return resolveFamilyGroupTitularSuggestedAmount(supabase, familyGroupId);
  const { data: st } = await supabase.from("Student").select("planId").eq("id", payerStudentId).maybeSingle();
  const planId = (st as { planId?: string | null } | null)?.planId ?? null;
  if (!planId) return 0;
  const { data: plan } = await supabase.from("Plan").select("id, priceMonthly").eq("id", planId).maybeSingle();
  if (!plan) return 0;
  const base = resolvePlanMonthlyTuition((plan as { id: string }).id, Number((plan as { priceMonthly: number | string }).priceMonthly ?? 0));
  // Fidelização: o automático passa a cobrar o valor com desconto (o cron diário aplica-o a partir do ciclo seguinte).
  const discount = await individualLoyaltyDiscount(supabase, payerStudentId, planId, currentReferenceMonthLisbon(new Date()));
  return Math.max(0, base - discount);
}

/** Plano Revolut para um valor mensal (um por valor e ambiente; criado na primeira vez). */
async function ensurePricePlanVariation(supabase: SupabaseClient, amount: number): Promise<string> {
  const amountCents = Math.round(amount * 100);
  const { data: existing } = await supabase
    .from("RevolutPricePlan")
    .select("variationId")
    .eq("environment", revolutMerchantEnv)
    .eq("amountCents", amountCents)
    .maybeSingle();
  if (existing) return (existing as { variationId: string }).variationId;

  const label = (amountCents / 100).toFixed(2).replace(".", ",");
  const plan = await createMonthlySubscriptionPlan({ name: `Mensalidade Kingdom Fight School · ${label} €`, amountCents });
  const variationId = plan.variations?.[0]?.id;
  if (!variationId) throw new Error("Plano Revolut sem variação");
  const { error } = await supabase.from("RevolutPricePlan").insert({ id: crypto.randomUUID(), environment: revolutMerchantEnv, amountCents, planId: plan.id, variationId });
  if (error) {
    // Corrida com outro pedido para o mesmo valor: usa o que ficou guardado.
    const { data: again } = await supabase.from("RevolutPricePlan").select("variationId").eq("environment", revolutMerchantEnv).eq("amountCents", amountCents).maybeSingle();
    if (again) return (again as { variationId: string }).variationId;
    throw new Error(error.message);
  }
  return variationId;
}

/** Mês que a 1.ª cobrança paga: a mensalidade em atraso mais antiga; senão o mês atual (ou o seguinte, se já estiver pago). */
export async function firstMonthToPay(supabase: SupabaseClient, payerStudentId: string): Promise<string> {
  const { data: late } = await supabase
    .from("Payment")
    .select("referenceMonth")
    .eq("studentId", payerStudentId)
    .eq("paymentType", "TUITION")
    .eq("status", "LATE")
    .not("referenceMonth", "is", null)
    .order("referenceMonth", { ascending: true })
    .limit(1);
  const oldestLate = (late?.[0] as { referenceMonth?: string } | undefined)?.referenceMonth;
  if (oldestLate) return oldestLate;

  let month = currentReferenceMonthLisbon(new Date());
  const { data: paid } = await supabase
    .from("Payment")
    .select("referenceMonth")
    .eq("studentId", payerStudentId)
    .eq("paymentType", "TUITION")
    .eq("status", "PAID")
    .gte("referenceMonth", month);
  const paidMonths = new Set(((paid ?? []) as { referenceMonth: string }[]).map((p) => p.referenceMonth));
  for (let i = 0; i < 24 && paidMonths.has(month); i++) month = addMonthsToReferenceMonth(month, 1);
  return month;
}

export type StartAutoPayResult = { url?: string; error?: string };

/** Aluno clica «Ativar»: cria cliente + subscrição na Revolut e devolve a página de pagamento da adesão. */
export async function startAutoPay(
  supabase: SupabaseClient,
  input: { studentId: string; fullName: string; email: string | null; returnUrl: string }
): Promise<StartAutoPayResult> {
  const payer = await resolveAutoPayPayer(supabase, input.studentId);
  if (payer.isFamilyMember) return { error: "O pagamento automático do teu grupo familiar é ativado pelo titular do grupo." };
  const amount = await expectedMonthlyAmount(supabase, payer.payerStudentId, payer.familyGroupId);
  if (!(amount > 0)) return { error: "Não tens um plano com mensalidade. Fala com a secretaria." };

  const existing = await loadAutoPayForStudent(supabase, payer.payerStudentId);
  if (existing && existing.state === "ACTIVE" && existing.environment === revolutMerchantEnv) return { error: "O pagamento automático já está ativo." };
  // Adesão anterior por concluir ou cobrança falhada: começa de novo (a subscrição antiga é cancelada).
  if (existing?.revolutSubscriptionId && existing.environment === revolutMerchantEnv && existing.state !== "CANCELLED") {
    try {
      await cancelMerchantSubscription(existing.revolutSubscriptionId);
    } catch (e) {
      console.error("[autopay] cancelar subscrição anterior", e);
    }
  }

  const customerId =
    existing?.revolutCustomerId && existing.environment === revolutMerchantEnv
      ? existing.revolutCustomerId
      : (await createMerchantCustomer({ fullName: input.fullName, email: input.email })).id;
  const variationId = await ensurePricePlanVariation(supabase, amount);
  const sub = await createMerchantSubscription({
    planVariationId: variationId,
    customerId,
    externalReference: payer.payerStudentId,
    redirectUrl: input.returnUrl,
    idempotencyKey: crypto.randomUUID(),
  });
  if (!sub.setup_order_id) return { error: "A Revolut não devolveu a página de pagamento. Tenta outra vez." };
  const setupOrder = await getMerchantOrder(sub.setup_order_id);
  if (!setupOrder.checkout_url) return { error: "A Revolut não devolveu a página de pagamento. Tenta outra vez." };

  // Se o automático anterior falhou, a nova adesão continua a partir do mês que ficou por pagar.
  const firstReferenceMonth = await firstMonthToPay(supabase, payer.payerStudentId);
  const now = new Date().toISOString();
  const row = {
    studentId: payer.payerStudentId,
    familyGroupId: payer.familyGroupId,
    environment: revolutMerchantEnv,
    state: "PENDING",
    amount,
    billingDay: null,
    firstReferenceMonth,
    revolutCustomerId: customerId,
    revolutSubscriptionId: sub.id,
    revolutPlanVariationId: variationId,
    setupOrderId: sub.setup_order_id,
    paymentMethodLabel: null,
    nextChargeAt: null,
    lastReminderFor: null,
    activatedAt: null,
    cancelledAt: null,
    updatedAt: now,
  };
  const { error } = existing
    ? await supabase.from("AutoPay").update(row).eq("id", existing.id)
    : await supabase.from("AutoPay").insert({ id: crypto.randomUUID(), ...row, createdAt: now });
  if (error) return { error: "Não foi possível guardar o pagamento automático." };
  return { url: setupOrder.checkout_url };
}

function mapState(revolutState: string, current: AutoPayState): AutoPayState {
  const s = revolutState.toLowerCase();
  if (s === "pending") return "PENDING";
  if (s === "overdue") return "OVERDUE";
  if (s === "cancelled" || s === "finished") return "CANCELLED";
  if (s === "active") return "ACTIVE";
  return current === "PENDING" ? "PENDING" : "ACTIVE";
}

/** Regista a mensalidade paga por uma cobrança automática (idempotente pela ordem Revolut). */
async function recordCharge(supabase: SupabaseClient, row: AutoPayRow, order: MerchantOrder, cycleNumber: number): Promise<void> {
  const firstMonth = row.firstReferenceMonth ?? currentReferenceMonthLisbon(new Date());
  const referenceMonth = addMonthsToReferenceMonth(firstMonth, Math.max(0, cycleNumber - 1));
  const amount = order.amount / 100;

  const { data: monthRows } = await supabase
    .from("Payment")
    .select("id, status, revolutOrderId")
    .eq("studentId", row.studentId)
    .eq("paymentType", "TUITION")
    .eq("referenceMonth", referenceMonth);
  const rows = (monthRows ?? []) as { id: string; status: string; revolutOrderId: string | null }[];
  const paidOther = rows.find((r) => r.status === "PAID" && r.revolutOrderId !== order.id);
  if (paidOther) {
    // Mês já pago por outra via (transferência na secretaria): não sobrescreve; fica para o admin reembolsar/acertar.
    console.error("[autopay] cobrança automática num mês já pago", { studentId: row.studentId, referenceMonth, order: order.id });
    return;
  }

  const res = await registerTuitionPaymentCore(supabase, {
    studentId: row.studentId,
    amount,
    referenceMonth,
    status: "PAID",
    tuitionMonths: 1,
    paymentMethod: "TRANSFER",
  });
  if (res.error) {
    console.error("[autopay] registar mensalidade", res.error);
    return;
  }
  await supabase
    .from("Payment")
    .update({ revolutOrderId: order.id })
    .eq("studentId", row.studentId)
    .eq("paymentType", "TUITION")
    .eq("referenceMonth", referenceMonth)
    .eq("status", "PAID");
}

/** Lê a subscrição na Revolut e atualiza o estado, as mensalidades pagas, o dia e a próxima cobrança. */
export async function syncAutoPay(supabase: SupabaseClient, row: AutoPayRow): Promise<AutoPayRow> {
  if (!row.revolutSubscriptionId || row.environment !== revolutMerchantEnv) return row;
  const sub = await getMerchantSubscription(row.revolutSubscriptionId);
  const cycles = await listMerchantSubscriptionCycles(row.revolutSubscriptionId);

  // Ordens de cada ciclo (a adesão é o ciclo 1, mesmo que a Revolut ainda não a mostre como ciclo).
  const byOrder = new Map<string, number>();
  for (const c of cycles) if (c.order_id) byOrder.set(c.order_id, c.number);
  if (row.setupOrderId && !byOrder.has(row.setupOrderId)) byOrder.set(row.setupOrderId, 1);

  const orderIds = [...byOrder.keys()];
  const { data: recorded } = orderIds.length ? await supabase.from("Payment").select("revolutOrderId").in("revolutOrderId", orderIds) : { data: [] };
  const done = new Set(((recorded ?? []) as { revolutOrderId: string }[]).map((r) => r.revolutOrderId));

  let firstChargeAt: Date | null = null;
  let latestLabel: string | null = row.paymentMethodLabel;
  for (const [orderId, number] of [...byOrder.entries()].sort((a, b) => a[1] - b[1])) {
    if (done.has(orderId) && latestLabel) continue;
    const order = await getMerchantOrder(orderId);
    if (order.state !== "completed") continue;
    if (number === 1 && order.created_at) firstChargeAt = new Date(order.created_at);
    latestLabel = paymentMethodLabel(order) ?? latestLabel;
    if (!done.has(orderId)) await recordCharge(supabase, row, order, number);
  }

  const prevState = row.state;
  const state = mapState(sub.state, row.state);
  const patch: Partial<AutoPayRow> & { updatedAt: string; lastSyncedAt: string } = {
    state,
    paymentMethodLabel: latestLabel,
    updatedAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
  };

  let billingDay = row.billingDay;
  if (billingDay == null && (firstChargeAt || state === "ACTIVE")) {
    billingDay = billingDayFrom(firstChargeAt ?? new Date());
    patch.billingDay = billingDay;
  }

  // Próxima cobrança = fim do ciclo ativo; corrige-a se não coincidir com o dia de cobrança (meses curtos, mudança do admin).
  const active = cycles.find((c) => c.state === "active") ?? cycles.find((c) => c.id === sub.current_cycle_id);
  let next = active?.end_date ? new Date(active.end_date) : null;
  if (state === "ACTIVE" && billingDay && next && active?.start_date) {
    const desired = nextChargeAfter(billingDay, new Date(active.start_date));
    if (!sameLisbonDay(desired, next) && desired.getTime() > Date.now()) {
      try {
        await changeMerchantSubscriptionRenewalDate(row.revolutSubscriptionId, desired);
        next = desired;
      } catch (e) {
        console.error("[autopay] corrigir data de cobrança", e);
      }
    }
  }
  patch.nextChargeAt = state === "ACTIVE" || state === "OVERDUE" ? next?.toISOString() ?? null : null;

  // Valor mudou (outro plano, grupo familiar): aplica a partir do próximo ciclo.
  if (state === "ACTIVE") {
    const expected = await expectedMonthlyAmount(supabase, row.studentId, row.familyGroupId);
    if (expected > 0 && Math.round(expected * 100) !== Math.round(row.amount * 100)) {
      try {
        const variationId = await ensurePricePlanVariation(supabase, expected);
        await changeMerchantSubscriptionPlan(row.revolutSubscriptionId, variationId);
        patch.amount = expected;
        patch.revolutPlanVariationId = variationId;
      } catch (e) {
        console.error("[autopay] mudar valor", e);
      }
    }
  }

  if (state === "ACTIVE" && prevState === "PENDING") {
    patch.activatedAt = new Date().toISOString();
    await createInAppNotification(supabase, {
      studentId: row.studentId,
      type: "GENERAL",
      title: "Pagamento automático ativo",
      body: "A tua mensalidade passa a ser cobrada automaticamente todos os meses.",
      href: "/dashboard/financeiro",
    });
  }
  if (state === "ACTIVE" && prevState === "OVERDUE") {
    await createInAppNotification(supabase, {
      studentId: row.studentId,
      type: "PAYMENT_RESTORED",
      title: "Mensalidade cobrada com sucesso",
      body: "O pagamento automático voltou a funcionar.",
      href: "/dashboard/financeiro",
    });
  }
  if (state === "OVERDUE" && prevState !== "OVERDUE") {
    await createInAppNotification(supabase, {
      studentId: row.studentId,
      type: "PAYMENT_OVERDUE",
      title: "Não conseguimos cobrar a mensalidade",
      body: "O banco recusou o pagamento automático. Ativa-o de novo com outro cartão ou paga por transferência.",
      href: "/dashboard/financeiro",
    });
  }
  if (state === "CANCELLED" && prevState !== "CANCELLED") patch.cancelledAt = new Date().toISOString();

  await supabase.from("AutoPay").update(patch).eq("id", row.id);
  return { ...row, ...patch } as AutoPayRow;
}

/** Cancela (pelo aluno ou pelo admin). As mensalidades já pagas ficam. */
export async function cancelAutoPay(supabase: SupabaseClient, row: AutoPayRow): Promise<{ error?: string }> {
  if (row.revolutSubscriptionId && row.environment === revolutMerchantEnv && row.state !== "CANCELLED") {
    try {
      await cancelMerchantSubscription(row.revolutSubscriptionId);
    } catch (e) {
      console.error("[autopay] cancelar", e);
      return { error: "Não foi possível cancelar na Revolut. Tenta outra vez." };
    }
  }
  const now = new Date().toISOString();
  await supabase.from("AutoPay").update({ state: "CANCELLED", cancelledAt: now, nextChargeAt: null, updatedAt: now }).eq("id", row.id);
  return {};
}

/** Admin muda o dia de cobrança: guarda e move já a próxima cobrança para esse dia. */
export async function setAutoPayBillingDay(supabase: SupabaseClient, row: AutoPayRow, billingDay: number): Promise<{ error?: string }> {
  if (!Number.isInteger(billingDay) || billingDay < 1 || billingDay > 31) return { error: "Dia inválido (1 a 31)." };
  const patch: Record<string, unknown> = { billingDay, updatedAt: new Date().toISOString() };
  if (row.state === "ACTIVE" && row.revolutSubscriptionId && row.environment === revolutMerchantEnv) {
    const next = nextChargeAfter(billingDay);
    try {
      await changeMerchantSubscriptionRenewalDate(row.revolutSubscriptionId, next);
      patch.nextChargeAt = next.toISOString();
      patch.lastReminderFor = null;
    } catch (e) {
      console.error("[autopay] mudar dia", e);
      return { error: "A Revolut não aceitou a nova data. Tenta outro dia." };
    }
  }
  await supabase.from("AutoPay").update(patch).eq("id", row.id);
  return {};
}

/** Aviso no sino 3 dias antes de cada cobrança (uma vez por cobrança). */
export async function remindUpcomingCharge(supabase: SupabaseClient, row: AutoPayRow): Promise<boolean> {
  if (row.state !== "ACTIVE" || !row.nextChargeAt) return false;
  const next = new Date(row.nextChargeAt);
  const msLeft = next.getTime() - Date.now();
  if (msLeft <= 0 || msLeft > 3 * 86_400_000) return false;
  if (row.lastReminderFor && sameLisbonDay(new Date(row.lastReminderFor), next)) return false;
  const day = next.toLocaleDateString("pt-PT", { timeZone: "Europe/Lisbon", day: "numeric", month: "long" });
  const amount = row.amount % 1 === 0 ? row.amount.toFixed(0) : row.amount.toFixed(2).replace(".", ",");
  await createInAppNotification(supabase, {
    studentId: row.studentId,
    type: "GENERAL",
    title: `Mensalidade cobrada a ${day}`,
    body: `Vamos cobrar ${amount} € automaticamente. Não precisas de fazer nada.`,
    href: "/dashboard/financeiro",
  });
  await supabase.from("AutoPay").update({ lastReminderFor: next.toISOString() }).eq("id", row.id);
  return true;
}

export function syncAutoPaySafe(supabase: SupabaseClient, row: AutoPayRow): Promise<AutoPayRow> {
  return syncAutoPay(supabase, row).catch((e) => {
    console.error("[autopay] sync", row.id, e);
    return row;
  });
}
