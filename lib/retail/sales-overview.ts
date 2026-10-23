import type { SupabaseClient } from "@supabase/supabase-js";
import { imageForColor, parseProductImages } from "@/lib/retail/product-images";
import { orderReference } from "@/lib/retail/orders";

/** Origem de uma venda: ao balcão (POS), encomenda confirmada à mão, ou encomenda paga online (Revolut). */
export type SaleOrigin = "COUNTER" | "ORDER_MANUAL" | "ORDER_ONLINE";

export const SALE_ORIGIN_LABEL: Record<SaleOrigin, string> = {
  COUNTER: "Balcão",
  ORDER_MANUAL: "Encomenda",
  ORDER_ONLINE: "Online · Revolut",
};

export type SaleOverviewLine = { productName: string; label: string; quantity: number; lineTotal: number; imageUrl: string | null };

export type SaleOverview = {
  id: string;
  soldAt: string;
  totalAmount: number;
  paymentMethod: string;
  notes: string | null;
  origin: SaleOrigin;
  customerName: string | null;
  studentId: string | null;
  orderId: string | null;
  orderRef: string | null;
  orderStatus: string | null;
  schoolName: string | null;
  registeredByName: string | null;
  lines: SaleOverviewLine[];
};

/** Limites do mês (AAAA-MM) como em listRetailSales/sumRetailSalesForMonth, para os totais baterem certo. */
function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split("-").map(Number);
  return { start: `${month}-01T00:00:00.000Z`, end: new Date(y, m, 1).toISOString() };
}

export function previousMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

export function nextMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("pt-PT", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** Vendas concluídas de um mês, com cliente, artigos, origem e ligação à encomenda. */
export async function loadSalesOverview(supabase: SupabaseClient, month: string, limit = 500): Promise<SaleOverview[]> {
  if (!/^\d{4}-\d{2}$/.test(month)) return [];
  const { start, end } = monthRange(month);
  const { data: salesData } = await supabase
    .from("RetailSale")
    .select("id, schoolId, soldAt, paymentMethod, totalAmount, studentId, registeredByUserId, notes")
    .eq("status", "COMPLETED")
    .gte("soldAt", start)
    .lt("soldAt", end)
    .order("soldAt", { ascending: false })
    .limit(limit);
  const sales = (salesData ?? []) as {
    id: string;
    schoolId: string | null;
    soldAt: string;
    paymentMethod: string;
    totalAmount: number | string;
    studentId: string | null;
    registeredByUserId: string | null;
    notes: string | null;
  }[];
  if (!sales.length) return [];
  const saleIds = sales.map((s) => s.id);

  const [{ data: linesData }, { data: ordersData }, { data: schoolsData }] = await Promise.all([
    supabase.from("RetailSaleLine").select("saleId, variantId, quantity, lineTotal").in("saleId", saleIds),
    supabase.from("RetailOrder").select("id, number, saleId, status, paidConfirmedByUserId, customerName").in("saleId", saleIds),
    supabase.from("School").select("id, name"),
  ]);
  const lines = (linesData ?? []) as { saleId: string; variantId: string; quantity: number; lineTotal: number | string }[];
  const orders = (ordersData ?? []) as { id: string; number: number | string; saleId: string; status: string; paidConfirmedByUserId: string | null; customerName: string | null }[];
  const schoolName = new Map(((schoolsData ?? []) as { id: string; name: string | null }[]).map((s) => [s.id, s.name]));

  const variantIds = [...new Set(lines.map((l) => l.variantId))];
  const { data: variantsData } = variantIds.length ? await supabase.from("ProductVariant").select("id, productId, size, color, fit").in("id", variantIds) : { data: [] };
  const variants = new Map(((variantsData ?? []) as { id: string; productId: string; size: string | null; color: string | null; fit?: string | null }[]).map((v) => [v.id, v]));
  const productIds = [...new Set([...variants.values()].map((v) => v.productId))];
  const { data: productsData } = productIds.length ? await supabase.from("Product").select("id, name, images").in("id", productIds) : { data: [] };
  const products = new Map(((productsData ?? []) as { id: string; name: string; images?: unknown }[]).map((p) => [p.id, { name: p.name, images: parseProductImages(p.images) }]));

  // Nomes: alunos (via conta) e quem registou a venda.
  const studentIds = [...new Set(sales.map((s) => s.studentId).filter((x): x is string => !!x))];
  const { data: studentsData } = studentIds.length ? await supabase.from("Student").select("id, userId").in("id", studentIds) : { data: [] };
  const studentUser = new Map(((studentsData ?? []) as { id: string; userId: string }[]).map((s) => [s.id, s.userId]));
  const userIds = [...new Set([...studentUser.values(), ...sales.map((s) => s.registeredByUserId).filter((x): x is string => !!x)])];
  const { data: usersData } = userIds.length ? await supabase.from("User").select("id, name, email").in("id", userIds) : { data: [] };
  const userName = new Map(((usersData ?? []) as { id: string; name: string | null; email: string | null }[]).map((u) => [u.id, u.name?.trim() || u.email || null]));

  const orderBySale = new Map(orders.map((o) => [o.saleId, o]));
  return sales.map((s) => {
    const order = orderBySale.get(s.id) ?? null;
    const online = order ? order.paidConfirmedByUserId == null : /pago online/i.test(s.notes ?? "");
    const origin: SaleOrigin = order || /^Encomenda /.test(s.notes ?? "") ? (online ? "ORDER_ONLINE" : "ORDER_MANUAL") : "COUNTER";
    const refFromNotes = (s.notes ?? "").match(/KFS-ENC-\d+/)?.[0] ?? null;
    const studentName = s.studentId ? userName.get(studentUser.get(s.studentId) ?? "") ?? null : null;
    return {
      id: s.id,
      soldAt: s.soldAt,
      totalAmount: Number(s.totalAmount),
      paymentMethod: s.paymentMethod,
      notes: s.notes,
      origin,
      customerName: studentName ?? order?.customerName ?? null,
      studentId: s.studentId,
      orderId: order?.id ?? null,
      orderRef: order ? orderReference(Number(order.number)) : refFromNotes,
      orderStatus: order?.status ?? null,
      schoolName: s.schoolId ? schoolName.get(s.schoolId) ?? null : null,
      registeredByName: s.registeredByUserId ? userName.get(s.registeredByUserId) ?? null : null,
      lines: lines
        .filter((l) => l.saleId === s.id)
        .map((l) => {
          const v = variants.get(l.variantId);
          const p = v ? products.get(v.productId) : undefined;
          return {
            productName: p?.name ?? "Produto",
            label: [v?.fit, v?.color, v?.size].filter(Boolean).join(" · ") || "Único",
            quantity: l.quantity,
            lineTotal: Number(l.lineTotal),
            imageUrl: p && v ? imageForColor(p.images, v.color) : null,
          };
        }),
    };
  });
}
