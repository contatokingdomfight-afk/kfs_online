import { NextRequest, NextResponse } from "next/server";
import { getCurrentDbUserUncached } from "@/lib/auth/get-current-user";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { loadOrders, orderReference } from "@/lib/retail/orders";
import { createMerchantOrder, revolutMerchantConfigured } from "@/lib/revolut/merchant";

/**
 * Pagamento online de uma encomenda da loja (checkout hospedado da Revolut).
 * O valor vem sempre da encomenda na base de dados, nunca do cliente.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentDbUserUncached();
  if (!user) return NextResponse.json({ error: "Entra na tua conta para continuar." }, { status: 401 });
  if (!revolutMerchantConfigured) return NextResponse.json({ error: "Pagamento online não configurado." }, { status: 503 });
  const admin = getAdminClientOrNull().client;
  if (!admin) return NextResponse.json({ error: "Configuração do servidor em falta." }, { status: 500 });

  const body = (await request.json().catch(() => ({}))) as { orderId?: string };
  const orderId = String(body.orderId ?? "");
  if (!orderId) return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });

  const [order] = await loadOrders(admin, { ids: [orderId] });
  const { data: owner } = await admin.from("RetailOrder").select("createdByUserId").eq("id", orderId).maybeSingle();
  const mine = (owner as { createdByUserId: string | null } | null)?.createdByUserId === user.id;
  if (!order || !mine) return NextResponse.json({ error: "Encomenda não encontrada." }, { status: 404 });
  if (order.status !== "PENDING_PAYMENT") return NextResponse.json({ error: "Esta encomenda já não está por pagar." }, { status: 400 });
  if (order.totalAmount <= 0) return NextResponse.json({ error: "Valor inválido." }, { status: 400 });

  try {
    const base = order.studentId ? "/dashboard/loja" : "/loja";
    const mo = await createMerchantOrder({
      amountEur: order.totalAmount,
      description: `Encomenda ${orderReference(order.number)} · Kingdom Fight School`,
      reference: order.id,
      redirectUrl: `${request.nextUrl.origin}${base}/encomendas/${order.id}?pago=1`,
      email: user.email,
    });
    if (!mo.checkout_url) throw new Error("Resposta sem checkout_url");
    return NextResponse.json({ url: mo.checkout_url });
  } catch (err) {
    console.error("revolut merchant-checkout error:", err);
    return NextResponse.json({ error: "Não foi possível iniciar o pagamento." }, { status: 500 });
  }
}
