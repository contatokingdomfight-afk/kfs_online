import { NextRequest, NextResponse } from "next/server";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getDefaultOnboardingSchoolId } from "@/lib/onboarding-default-school";
import { loadOrders } from "@/lib/retail/orders";
import { markRetailOrderPaid } from "@/lib/retail/mark-paid";
import { getMerchantOrder, verifyMerchantWebhook } from "@/lib/revolut/merchant";

/**
 * Webhook da Revolut Merchant API. Valida a assinatura, volta a ler a ordem na Revolut
 * (não confiamos só no corpo) e marca a encomenda como paga.
 */
export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (!verifyMerchantWebhook(raw, request.headers.get("revolut-signature"), request.headers.get("revolut-request-timestamp"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { event?: string; order_id?: string };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }
  // Só interessa o pagamento concluído; os restantes eventos são aceites e ignorados.
  if (event.event !== "ORDER_COMPLETED" || !event.order_id) return NextResponse.json({ ok: true });

  const admin = getAdminClientOrNull().client;
  if (!admin) return NextResponse.json({ error: "Server config missing" }, { status: 500 });

  try {
    const mo = await getMerchantOrder(event.order_id);
    // Reembolsos também geram ORDER_COMPLETED: só ordens de pagamento concluídas.
    if (mo.state !== "completed" || (mo.type && mo.type !== "payment")) return NextResponse.json({ ok: true });
    const orderId = mo.merchant_order_data?.reference;
    if (!orderId) return NextResponse.json({ ok: true });

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
