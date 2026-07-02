import type { SupabaseClient } from "@supabase/supabase-js";
import type { RetailPaymentMethod } from "@/lib/retail/constants";
import { variantLabel } from "@/lib/retail/catalog";
import { recordStockMovement } from "@/lib/retail/inventory";
import type { RetailSaleDetail, RetailSaleRow } from "@/lib/retail/types";

export type SaleLineInput = {
  variantId: string;
  quantity: number;
  unitPrice: number;
};

export type CreateRetailSaleInput = {
  schoolId: string;
  paymentMethod: RetailPaymentMethod;
  lines: SaleLineInput[];
  studentId?: string | null;
  registeredByUserId: string;
  notes?: string | null;
};

export async function createRetailSale(
  supabase: SupabaseClient,
  input: CreateRetailSaleInput
): Promise<{ error?: string; saleId?: string }> {
  if (!input.lines.length) return { error: "Adiciona pelo menos um artigo." };

  const saleId = crypto.randomUUID();
  let total = 0;
  const lineRows: Array<{
    id: string;
    saleId: string;
    variantId: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }> = [];

  for (const line of input.lines) {
    if (line.quantity < 1) return { error: "Quantidade inválida." };
    const lineTotal = Math.round(line.unitPrice * line.quantity * 100) / 100;
    total += lineTotal;
    lineRows.push({
      id: crypto.randomUUID(),
      saleId,
      variantId: line.variantId,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal,
    });
  }

  const { error: saleErr } = await supabase.from("RetailSale").insert({
    id: saleId,
    schoolId: input.schoolId,
    soldAt: new Date().toISOString(),
    paymentMethod: input.paymentMethod,
    totalAmount: total.toFixed(2),
    status: "COMPLETED",
    studentId: input.studentId ?? null,
    registeredByUserId: input.registeredByUserId,
    notes: input.notes?.trim() || null,
  });
  if (saleErr) return { error: saleErr.message };

  const { error: linesErr } = await supabase.from("RetailSaleLine").insert(lineRows);
  if (linesErr) {
    await supabase.from("RetailSale").delete().eq("id", saleId);
    return { error: linesErr.message };
  }

  for (const line of lineRows) {
    const stockResult = await recordStockMovement(supabase, {
      variantId: line.variantId,
      schoolId: input.schoolId,
      movementType: "OUT",
      quantity: line.quantity,
      referenceType: "RETAIL_SALE",
      referenceId: saleId,
      createdByUserId: input.registeredByUserId,
    });
    if (stockResult.error) {
      await supabase.from("RetailSaleLine").delete().eq("saleId", saleId);
      await supabase.from("RetailSale").delete().eq("id", saleId);
      return { error: stockResult.error };
    }
  }

  return { saleId };
}

export async function listRetailSales(
  supabase: SupabaseClient,
  options?: { schoolId?: string; month?: string; limit?: number }
): Promise<RetailSaleRow[]> {
  const limit = options?.limit ?? 100;
  let q = supabase
    .from("RetailSale")
    .select("id, schoolId, soldAt, paymentMethod, totalAmount, status, studentId, registeredByUserId, notes")
    .eq("status", "COMPLETED")
    .order("soldAt", { ascending: false })
    .limit(limit);

  if (options?.schoolId) q = q.eq("schoolId", options.schoolId);
  if (options?.month && /^\d{4}-\d{2}$/.test(options.month)) {
    const [y, m] = options.month.split("-").map(Number);
    const start = `${options.month}-01T00:00:00.000Z`;
    const endNext = new Date(y, m, 1).toISOString();
    q = q.gte("soldAt", start).lt("soldAt", endNext);
  }

  const { data } = await q;
  return (data ?? []).map((r) => ({
    id: (r as { id: string }).id,
    schoolId: (r as { schoolId: string }).schoolId,
    soldAt: (r as { soldAt: string }).soldAt,
    paymentMethod: (r as { paymentMethod: string }).paymentMethod,
    totalAmount: Number((r as { totalAmount: number }).totalAmount),
    status: (r as { status: string }).status,
    studentId: (r as { studentId?: string | null }).studentId ?? null,
    registeredByUserId: (r as { registeredByUserId?: string | null }).registeredByUserId ?? null,
    notes: (r as { notes?: string | null }).notes ?? null,
  }));
}

export async function getRetailSaleDetail(
  supabase: SupabaseClient,
  saleId: string
): Promise<RetailSaleDetail | null> {
  const { data: sale } = await supabase
    .from("RetailSale")
    .select("id, schoolId, soldAt, paymentMethod, totalAmount, status, studentId, registeredByUserId, notes")
    .eq("id", saleId)
    .maybeSingle();
  if (!sale) return null;

  const row = sale as RetailSaleRow;
  const [{ data: school }, { data: lines }] = await Promise.all([
    supabase.from("School").select("name").eq("id", row.schoolId).maybeSingle(),
    supabase.from("RetailSaleLine").select("id, saleId, variantId, quantity, unitPrice, lineTotal").eq("saleId", saleId),
  ]);

  const variantIds = (lines ?? []).map((l) => (l as { variantId: string }).variantId);
  const { data: variants } = variantIds.length
    ? await supabase.from("ProductVariant").select("id, productId, sku, size, color").in("id", variantIds)
    : { data: [] };
  const productIds = [...new Set((variants ?? []).map((v) => (v as { productId: string }).productId))];
  const { data: products } = productIds.length
    ? await supabase.from("Product").select("id, name").in("id", productIds)
    : { data: [] };

  let studentName: string | null = null;
  if (row.studentId) {
    const { data: st } = await supabase.from("Student").select("userId").eq("id", row.studentId).maybeSingle();
    if (st?.userId) {
      const { data: user } = await supabase.from("User").select("name, email").eq("id", st.userId).maybeSingle();
      studentName = user?.name ?? user?.email ?? null;
    }
  }

  let registeredByName: string | null = null;
  if (row.registeredByUserId) {
    const { data: user } = await supabase.from("User").select("name, email").eq("id", row.registeredByUserId).maybeSingle();
    registeredByName = user?.name ?? user?.email ?? null;
  }

  const productById = new Map((products ?? []).map((p) => [(p as { id: string }).id, p]));
  const variantById = new Map((variants ?? []).map((v) => [(v as { id: string }).id, v]));

  return {
    ...row,
    totalAmount: Number(row.totalAmount),
    schoolName: (school as { name?: string } | undefined)?.name ?? row.schoolId,
    studentName,
    registeredByName,
    lines: (lines ?? []).map((l) => {
      const line = l as { id: string; saleId: string; variantId: string; quantity: number; unitPrice: number; lineTotal: number };
      const v = variantById.get(line.variantId) as { productId: string; size: string | null; color: string | null };
      const p = productById.get(v.productId) as { name: string };
      return {
        ...line,
        unitPrice: Number(line.unitPrice),
        lineTotal: Number(line.lineTotal),
        productName: p?.name ?? "—",
        variantLabel: variantLabel(v as Parameters<typeof variantLabel>[0]),
      };
    }),
  };
}

/** Soma vendas loja COMPLETED num mês (soldAt). */
export async function sumRetailSalesForMonth(
  supabase: SupabaseClient,
  referenceMonth: string
): Promise<number> {
  if (!/^\d{4}-\d{2}$/.test(referenceMonth)) return 0;
  const sales = await listRetailSales(supabase, { month: referenceMonth, limit: 5000 });
  return sales.reduce((s, r) => s + r.totalAmount, 0);
}
