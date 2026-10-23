import { NextRequest, NextResponse } from "next/server";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getDefaultOnboardingSchoolId } from "@/lib/onboarding-default-school";
import { loadOrders } from "@/lib/retail/orders";
import { markRetailOrderPaid } from "@/lib/retail/mark-paid";
import { getMerchantOrder, revolutMerchantEnv, verifyMerchantWebhook, webhookSecretFingerprint } from "@/lib/revolut/merchant";
import { loadAutoPayBy, syncAutoPaySafe } from "@/lib/autopay/service";
import { CHECKOUT_REFERENCE_PREFIX, markTuitionCheckoutPaid } from "@/lib/tuition-checkout/service";

/**
 * Webhook da Revolut Merchant API. Valida a assinatura, volta a ler a ordem na Revolut
 * (não confiamos só no corpo) e marca a encomenda como paga.
 * Também trata o pagamento automático da mensalidade: eventos SUBSCRIPTION_* e as ordens de cada
 * cobrança mensal (sem referência de encomenda) sincronizam a subscrição do aluno.
 */
/** Diagnóstico da configuração (sem segredos): ambiente, se o segredo existe e a impressão digital dele. */
export async function GET() {
  return NextResponse.json({ env: revolutMerchantEnv, vercelEnv: process.env.VERCEL_ENV ?? null, webhookSecretSet: webhookSecretFingerprint() !== null, fingerprint: webhookSecretFingerprint() });
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (!verifyMerchantWebhook(raw, request.headers.get("revolut-signature"), request.headers.get("revolut-request-timestamp"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { event?: string; order_id?: string; subscription_id?: string };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }
  const admin = getAdminClientOrNull().client;
  if (!admin) return NextResponse.json({ error: "Server config missing" }, { status: 500 });

  // Pagamento automático: o evento só diz «mudou»; o estado real vem da Revolut (syncAutoPay).
  if (event.event?.startsWith("SUBSCRIPTION_") && event.subscription_id) {
    for (const row of await loadAutoPayBy(admin, "revolutSubscriptionId", event.subscription_id)) await syncAutoPaySafe(admin, row);
    return NextResponse.json({ ok: true });
  }

  // Só interessa o pagamento concluído; os restantes eventos são aceites e ignorados.
  if (event.event !== "ORDER_COMPLETED" || !event.order_id) return NextResponse.json({ ok: true });

  try {
    const mo = await getMerchantOrder(event.order_id);
    // Reembolsos também geram ORDER_COMPLETED: só ordens de pagamento concluídas.
    if (mo.state !== "completed" || (mo.type && mo.type !== "payment")) return NextResponse.json({ ok: true });
    const orderId = mo.merchant_order_data?.reference;
    // Mensalidades em atraso pagas online (aluno ou link enviado pelo admin).
    if (orderId?.startsWith(CHECKOUT_REFERENCE_PREFIX)) {
      const ok = await markTuitionCheckoutPaid(admin, orderId.slice(CHECKOUT_REFERENCE_PREFIX.length), mo);
      return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Could not mark tuition paid" }, { status: 500 });
    }
    if (!orderId) {
      // Sem referência de encomenda: adesão ou cobrança mensal de um pagamento automático.
      const rows = [...(await loadAutoPayBy(admin, "setupOrderId", mo.id)), ...(mo.customer?.id ? await loadAutoPayBy(admin, "revolutCustomerId", mo.customer.id) : [])];
      const seen = new Set<string>();
      for (const row of rows) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        await syncAutoPaySafe(admin, row);
      }
      return NextResponse.json({ ok: true });
    }

    const [order] = await loadOrders(admin, { ids: [orderId] });
    if (!order || order.status !== "PENDING_PAYMENT") return NextResponse.json({ ok: true });
    if (mo.currency !== "EUR" || mo.amount !== Math.round(order.totalAmount * 100)) {
      console.error("[revolut merchant-webhook] valor não corresponde", { orderId, paid: mo.amount, expected: order.totalAmount });
      return NextResponse.json({ ok: true });
    }

    const { data: owner } = await admin.from("RetailOrder").select("createdByUserId").eq("id", orderId).maybeSingle();
    const { data: stu } = order.studentId ? await admin.from("Student").select("userId").eq("id", order.studentId).maybeSingle() : { data: null };
    const registeredBy = (owner as { createdByUserId: string | null } | null)?.createdByUserId ?? (stu as { userId: string | null } | null)?.userId;
    let schoolId = order.schoolId;
    if (!schoolId) {
      const { data } = await admin.from("School").select("id, name").eq("isActive", true);
      schoolId = getDefaultOnboardingSchoolId((data ?? []) as { id: string; name: string | null }[]) || null;
    }
    if (!registeredBy || !schoolId) {
      console.error("[revolut merchant-webhook] encomenda sem utilizador/escola", orderId);
      return NextResponse.json({ error: "Order incomplete" }, { status: 500 });
    }

    const ok = await markRetailOrderPaid(admin, order, {
      method: "TRANSFER",
      schoolId,
      registeredByUserId: registeredBy,
      noteSuffix: " · pago online (Revolut)",
    });
    // 500 → a Revolut repete (3× de 10 em 10 min).
    if (!ok) return NextResponse.json({ error: "Could not mark paid" }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[revolut merchant-webhook]", err);
    return NextResponse.json({ error: "Processing error" }, { status: 500 });
  }
}
