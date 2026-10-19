import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getRevolutConfig, listTransactions, refreshAccessToken, type RevolutTransaction } from "@/lib/revolut/client";
import { loadPorReceberItems, type PorReceberItem } from "@/lib/finance/por-receber";
import { registerTuitionPaymentCore } from "@/lib/finance/register-tuition-core";
import { clearGraceOnPaidPayment } from "@/lib/payment-grace";
import { syncStudentPaymentStatus } from "@/lib/student-payment-status";
import { grantReferralRewardIfEligible } from "@/lib/referral-rewards";
import { currentReferenceMonthLisbon } from "@/lib/lisbon-payment-dates";
import { loadOrders, orderReference } from "@/lib/retail/orders";
import { createRetailSale } from "@/lib/retail/sales";
import { getDefaultOnboardingSchoolId } from "@/lib/onboarding-default-school";

/**
 * Confirmação automática das transferências recebidas na Revolut Business.
 * A plataforma só LÊ movimentos; marca como pago o que está «Por receber» quando a correspondência é certa.
 */

import { matchTransfer, normalizePayer, type MatchStatus } from "@/lib/revolut/match";
export { studentPaymentReference } from "@/lib/revolut/match";

const itemLabel = (it: PorReceberItem) => `${it.name} · ${it.what}`;

/** Marca um item «Por receber» como pago por transferência (sem sessão: usado pela sincronização e pelo admin). */
export async function applyReceivedItem(supabase: SupabaseClient, it: PorReceberItem, actorUserId: string | null): Promise<{ error?: string }> {
  if (it.kind === "ORDER" && it.orderId) {
    const [order] = await loadOrders(supabase, { ids: [it.orderId] });
    if (!order || order.status !== "PENDING_PAYMENT") return { error: "Encomenda já não está por pagar." };
    if (!actorUserId) return { error: "Sem utilizador para registar a venda." };
    const { data: schools } = await supabase.from("School").select("id, name").eq("isActive", true);
    const schoolId = order.schoolId ?? (getDefaultOnboardingSchoolId((schools ?? []) as { id: string; name: string | null }[]) || null);
    if (!schoolId) return { error: "Escola não encontrada." };
    const sale = await createRetailSale(supabase, {
      schoolId,
      paymentMethod: "TRANSFER",
      lines: order.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity, unitPrice: l.unitPrice })),
      studentId: order.studentId,
      registeredByUserId: actorUserId,
      notes: `Encomenda ${orderReference(order.number)} · transferência Revolut`,
      skipStock: true,
      discountAmount: order.discountAmount,
    });
    if (sale.error) return { error: sale.error };
    const now = new Date().toISOString();
    await supabase
      .from("RetailOrder")
      .update({ status: "PAID", paymentMethod: "TRANSFER", paidAt: now, paidConfirmedByUserId: actorUserId, saleId: sale.saleId, updatedAt: now })
      .eq("id", it.orderId)
      .eq("status", "PENDING_PAYMENT");
    return {};
  }

  if (it.kind !== "TUITION") return { error: "Seguros e matrículas confirmam-se em Financeiro → Receber." };

  if (it.paymentId) {
    const { error } = await supabase
      .from("Payment")
      .update({ amount: it.amount.toFixed(2), status: "PAID", paymentMethod: "TRANSFER" })
      .eq("id", it.paymentId)
      .eq("status", "LATE");
    if (error) return { error: error.message };
    await clearGraceOnPaidPayment(supabase, it.studentId);
    await syncStudentPaymentStatus(supabase, it.studentId);
  } else {
    if (!it.referenceMonth) return { error: "Mês em falta." };
    const core = await registerTuitionPaymentCore(supabase, {
      studentId: it.studentId,
      amount: it.amount,
      referenceMonth: it.referenceMonth,
      status: "PAID",
      tuitionMonths: 1,
      paymentMethod: "TRANSFER",
    });
    if (core.error) return core;
  }
  await grantReferralRewardIfEligible(supabase, it.studentId);
  return {};
}

type Ctx = { studentByCode: Map<number, string>; aliasByKey: Map<string, string>; orderNumberById: Map<string, number> };

async function loadContext(supabase: SupabaseClient, items: PorReceberItem[]): Promise<Ctx> {
  const [{ data: codes }, { data: aliases }] = await Promise.all([
    supabase.from("Student").select("id, paymentCode").not("paymentCode", "is", null),
    supabase.from("BankPayerAlias").select("payerKey, studentId"),
  ]);
  const orderIds = items.filter((i) => i.orderId).map((i) => i.orderId!);
  const orders = orderIds.length ? await loadOrders(supabase, { ids: orderIds }) : [];
  return {
    studentByCode: new Map(((codes ?? []) as { id: string; paymentCode: number }[]).map((r) => [Number(r.paymentCode), r.id])),
    aliasByKey: new Map(((aliases ?? []) as { payerKey: string; studentId: string }[]).map((r) => [r.payerKey, r.studentId])),
    orderNumberById: new Map(orders.map((o) => [o.id, o.number])),
  };
}

function incomingLeg(tx: RevolutTransaction) {
  if (tx.state !== "completed") return null;
  const leg = tx.legs?.find((l) => l.amount > 0 && l.currency === "EUR");
  return leg ?? null;
}

export type SyncResult = { fetched: number; created: number; autoApplied: number; suggested: number; error?: string };

/** Lê os movimentos novos da Revolut e confirma o que for certo. Seguro para correr várias vezes. */
export async function syncRevolutTransactions(supabase: SupabaseClient): Promise<SyncResult> {
  const cfg = getRevolutConfig();
  const out: SyncResult = { fetched: 0, created: 0, autoApplied: 0, suggested: 0 };
  if (!cfg) return { ...out, error: "Revolut não configurada (variáveis REVOLUT_* em falta)." };
  const { data: conn } = await supabase.from("RevolutConnection").select("refreshToken, connectedByUserId, lastSyncAt").eq("id", "default").maybeSingle();
  const connection = conn as { refreshToken: string; connectedByUserId: string | null; lastSyncAt: string | null } | null;
  if (!connection) return { ...out, error: "Revolut ainda não ligada." };

  try {
    const { access_token } = await refreshAccessToken(cfg, connection.refreshToken);
    const since = connection.lastSyncAt ? new Date(Date.parse(connection.lastSyncAt) - 3 * 86_400_000) : new Date(Date.now() - 35 * 86_400_000);
    const txs = await listTransactions(cfg, access_token, since.toISOString());
    out.fetched = txs.length;

    const incoming = txs.map((t) => ({ t, leg: incomingLeg(t) })).filter((x): x is { t: RevolutTransaction; leg: NonNullable<ReturnType<typeof incomingLeg>> } => x.leg !== null);
    const ids = incoming.map((x) => x.t.id);
    const { data: existing } = ids.length ? await supabase.from("BankTransaction").select("id").in("id", ids) : { data: [] };
    const known = new Set(((existing ?? []) as { id: string }[]).map((r) => r.id));
    const fresh = incoming.filter((x) => !known.has(x.t.id)).sort((a, b) => a.t.created_at.localeCompare(b.t.created_at));

    if (fresh.length) {
      let items = await loadPorReceberItems(supabase, currentReferenceMonthLisbon(new Date()));
      const ctx = await loadContext(supabase, items);
      for (const { t, leg } of fresh) {
        const payerName = (leg.description ?? "").trim();
        const reference = (t.reference ?? "").trim();
        const m = matchTransfer({ amount: leg.amount, payerName, reference }, items, {
          studentByCode: ctx.studentByCode,
          aliasStudent: ctx.aliasByKey.get(normalizePayer(payerName)) ?? null,
          orderNumberById: ctx.orderNumberById,
        });
        let status: MatchStatus = m.status;
        let appliedAt: string | null = null;
        if (m.status === "AUTO" && m.item) {
          const r = await applyReceivedItem(supabase, m.item, connection.connectedByUserId);
          if (r.error) status = "SUGGESTED";
          else {
            appliedAt = new Date().toISOString();
            out.autoApplied++;
            items = items.filter((i) => i.key !== m.item!.key);
          }
        }
        if (status === "SUGGESTED") out.suggested++;
        const { error } = await supabase.from("BankTransaction").insert({
          id: t.id,
          occurredAt: t.completed_at ?? t.created_at,
          amount: leg.amount.toFixed(2),
          currency: leg.currency,
          payerName: normalizePayer(payerName) || payerName || null,
          reference: reference || null,
          description: leg.description ?? null,
          state: t.state,
          matchStatus: status,
          matchedKind: status === "AUTO" ? m.item?.kind ?? null : null,
          matchedStudentId: m.studentId || null,
          matchedPaymentId: status === "AUTO" ? m.item?.paymentId ?? null : null,
          matchedOrderId: status === "AUTO" ? m.item?.orderId ?? null : null,
          matchedReferenceMonth: status === "AUTO" ? m.item?.referenceMonth ?? null : null,
          matchLabel: status === "AUTO" ? m.label : null,
          suggestions: status === "AUTO" ? [] : m.suggestions.length ? m.suggestions : m.item ? [{ itemKey: m.item.key, label: itemLabel(m.item), amount: m.item.amount }] : [],
          appliedAt,
        });
        if (!error) out.created++;
      }
    }
    await supabase.from("RevolutConnection").update({ lastSyncAt: new Date().toISOString(), lastSyncError: null }).eq("id", "default");
    return out;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase.from("RevolutConnection").update({ lastSyncError: msg.slice(0, 500) }).eq("id", "default");
    return { ...out, error: msg };
  }
}
