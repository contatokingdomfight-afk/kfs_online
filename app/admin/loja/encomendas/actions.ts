"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { adminPermissionError } from "@/lib/permissions/assert";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseFinancePaymentMethod } from "@/lib/finance-payment-method";
import { createRetailSale } from "@/lib/retail/sales";
import { createRetailOrder, loadOrders, orderReference, type OrderLineInput } from "@/lib/retail/orders";
import { createInAppNotification } from "@/lib/notifications/in-app";
import { getDefaultOnboardingSchoolId } from "@/lib/onboarding-default-school";

export type AdminOrderResult = { error?: string; success?: boolean };

async function requireStoreAdmin() {
  const u = await getCurrentDbUser();
  if (!u || u.role !== "ADMIN") return null;
  if (await adminPermissionError("admin:financeiro:write")) return null;
  return u;
}

function refresh(orderId?: string) {
  revalidatePath("/admin/loja/encomendas");
  revalidatePath("/admin/loja");
  revalidatePath("/dashboard/loja");
  if (orderId) revalidatePath(`/dashboard/loja/encomendas/${orderId}`);
}

async function defaultSchoolId(supabase: ReturnType<typeof createAdminClient>): Promise<string | null> {
  const { data } = await supabase.from("School").select("id, name").eq("isActive", true);
  return getDefaultOnboardingSchoolId((data ?? []) as { id: string; name: string | null }[]) || null;
}

/** Encomenda para quem não tem conta (amigos, familiares): nome + telefone. */
export async function createOrderForCustomer(_prev: AdminOrderResult | null, formData: FormData): Promise<AdminOrderResult> {
  const user = await requireStoreAdmin();
  if (!user) return { error: "Não autorizado." };
  const name = String(formData.get("customerName") ?? "").trim();
  const phone = String(formData.get("customerPhone") ?? "").trim();
  if (name.length < 2) return { error: "Indica o nome de quem encomenda." };
  if (phone.replace(/\D/g, "").length < 9) return { error: "Indica um telefone válido." };
  let lines: OrderLineInput[] = [];
  try {
    lines = (JSON.parse(String(formData.get("lines") ?? "[]")) as OrderLineInput[]).map((l) => ({ variantId: String(l.variantId), quantity: Number(l.quantity), recipientNote: l.recipientNote ?? null }));
  } catch {
    return { error: "Encomenda inválida." };
  }
  const supabase = createAdminClient();
  const result = await createRetailOrder(supabase, {
    lines,
    schoolId: await defaultSchoolId(supabase),
    customerName: name,
    customerPhone: phone,
    notes: String(formData.get("notes") ?? "") || null,
    createdByUserId: user.id,
    couponCode: String(formData.get("couponCode") ?? "") || null,
  });
  if (result.error) return { error: result.error };
  refresh();
  return { success: true };
}

/** Confirma o pagamento à mão: regista a venda (receita deste mês) sem mexer no stock. */
export async function confirmOrderPayment(formData: FormData): Promise<void> {
  const user = await requireStoreAdmin();
  if (!user) return;
  const orderId = String(formData.get("orderId") ?? "");
  const method = parseFinancePaymentMethod(String(formData.get("paymentMethod") ?? ""));
  if (!orderId || !method) return;
  const supabase = createAdminClient();
  const [order] = await loadOrders(supabase, { ids: [orderId] });
  if (!order || order.status !== "PENDING_PAYMENT") return;

  const schoolId = order.schoolId ?? (await defaultSchoolId(supabase));
  if (!schoolId) return;
  const sale = await createRetailSale(supabase, {
    schoolId,
    paymentMethod: method,
    lines: order.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity, unitPrice: l.unitPrice })),
    studentId: order.studentId,
    registeredByUserId: user.id,
    notes: `Encomenda ${orderReference(order.number)}${order.discountLabel ? ` · ${order.discountLabel}` : ""}`,
    skipStock: true,
    discountAmount: order.discountAmount,
  });
  if (sale.error) {
    console.error("[confirmOrderPayment]", sale.error);
    return;
  }
  const now = new Date().toISOString();
  await supabase
    .from("RetailOrder")
    .update({ status: "PAID", paymentMethod: method, paidAt: now, paidConfirmedByUserId: user.id, saleId: sale.saleId, updatedAt: now })
    .eq("id", orderId)
    .eq("status", "PENDING_PAYMENT");
  refresh(orderId);
}

/** Todas as encomendas pagas passam a «No fornecedor» (depois de fazer a encomenda ao fornecedor). */
export async function markPaidOrdersOrdered(formData: FormData): Promise<void> {
  const user = await requireStoreAdmin();
  if (!user) return;
  const ids = String(formData.get("ids") ?? "").split(",").filter(Boolean);
  if (ids.length === 0) return;
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  await supabase.from("RetailOrder").update({ status: "ORDERED", orderedAt: now, updatedAt: now }).in("id", ids).eq("status", "PAID");
  refresh();
}

/** Estados seguintes, um a um: ORDERED → READY (avisa o aluno) → DELIVERED. */
export async function advanceOrder(formData: FormData): Promise<void> {
  const user = await requireStoreAdmin();
  if (!user) return;
  const orderId = String(formData.get("orderId") ?? "");
  const to = String(formData.get("to") ?? "");
  const supabase = createAdminClient();
  const [order] = await loadOrders(supabase, { ids: [orderId] });
  if (!order) return;
  const now = new Date().toISOString();
  const allowed: Record<string, string[]> = { ORDERED: ["PAID"], READY: ["PAID", "ORDERED"], DELIVERED: ["READY", "ORDERED", "PAID"] };
  if (!allowed[to]?.includes(order.status)) return;
  const patch: Record<string, string> = { status: to, updatedAt: now };
  if (to === "ORDERED") patch.orderedAt = now;
  if (to === "READY") patch.readyAt = now;
  if (to === "DELIVERED") patch.deliveredAt = now;
  await supabase.from("RetailOrder").update(patch).eq("id", orderId);
  if (to === "READY" && order.studentId) {
    await createInAppNotification(supabase, {
      studentId: order.studentId,
      type: "GENERAL",
      title: "A tua encomenda está pronta 🎉",
      body: `${orderReference(order.number)} já chegou. Podes levantar na secretaria.`,
      href: `/dashboard/loja/encomendas/${order.id}`,
    });
  }
  refresh(orderId);
}

/** Cancelar (admin): se já estava paga, anula também a venda registada. */
export async function cancelOrderAsAdmin(formData: FormData): Promise<void> {
  const user = await requireStoreAdmin();
  if (!user) return;
  const orderId = String(formData.get("orderId") ?? "");
  const supabase = createAdminClient();
  const { data } = await supabase.from("RetailOrder").select("id, status, saleId").eq("id", orderId).maybeSingle();
  const order = data as { id: string; status: string; saleId: string | null } | null;
  if (!order || order.status === "DELIVERED" || order.status === "CANCELLED") return;
  if (order.saleId) await supabase.from("RetailSale").update({ status: "CANCELLED" }).eq("id", order.saleId);
  const now = new Date().toISOString();
  await supabase.from("RetailOrder").update({ status: "CANCELLED", cancelledAt: now, updatedAt: now }).eq("id", orderId);
  refresh(orderId);
}
