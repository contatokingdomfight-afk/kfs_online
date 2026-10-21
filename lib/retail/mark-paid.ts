import type { SupabaseClient } from "@supabase/supabase-js";
import type { RetailPaymentMethod } from "@/lib/retail/constants";
import { orderReference, type RetailOrder } from "@/lib/retail/orders";
import { createRetailSale } from "@/lib/retail/sales";

/**
 * Regista a venda (receita) e marca a encomenda como paga. Partilhado entre a confirmação manual do admin
 * e o webhook da Revolut. Só atua sobre encomendas «Por pagar»; devolve `false` se não conseguiu.
 */
export async function markRetailOrderPaid(
  supabase: SupabaseClient,
  order: RetailOrder,
  opts: { method: RetailPaymentMethod; schoolId: string; registeredByUserId: string; confirmedByUserId?: string | null; noteSuffix?: string }
): Promise<boolean> {
  if (order.status !== "PENDING_PAYMENT") return false;
  const sale = await createRetailSale(supabase, {
    schoolId: opts.schoolId,
    paymentMethod: opts.method,
    lines: order.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity, unitPrice: l.unitPrice })),
    studentId: order.studentId,
    registeredByUserId: opts.registeredByUserId,
    notes: `Encomenda ${orderReference(order.number)}${order.discountLabel ? ` · ${order.discountLabel}` : ""}${opts.noteSuffix ?? ""}`,
    skipStock: true,
    discountAmount: order.discountAmount,
  });
  if (sale.error) {
    console.error("[markRetailOrderPaid]", sale.error);
    return false;
  }
  const now = new Date().toISOString();
  await supabase
    .from("RetailOrder")
    .update({ status: "PAID", paymentMethod: opts.method, paidAt: now, paidConfirmedByUserId: opts.confirmedByUserId ?? null, saleId: sale.saleId, updatedAt: now })
    .eq("id", order.id)
    .eq("status", "PENDING_PAYMENT");
  return true;
}
