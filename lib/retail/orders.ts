import type { SupabaseClient } from "@supabase/supabase-js";
import { imageForColor, parseProductImages, type ProductImage } from "@/lib/retail/product-images";
import { computeDiscount } from "@/lib/retail/discounts";
import { findActiveCoupon, loadActivePromotions } from "@/lib/retail/discounts.server";

/** Encomendas da loja (pré-encomenda). Ver supabase/migrations/20261012140000_retail_orders.sql. */
export const ORDER_STATUSES = ["PENDING_PAYMENT", "PAID", "ORDERED", "READY", "DELIVERED", "CANCELLED"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABEL_PT: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Por pagar",
  PAID: "Paga",
  ORDERED: "No fornecedor",
  READY: "Pronta a levantar",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelada",
};

export const ORDER_STATUS_LABEL_EN: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  PAID: "Paid",
  ORDERED: "With supplier",
  READY: "Ready to collect",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

/** Passos mostrados ao aluno (cancelada fica de fora). */
export const ORDER_FLOW: OrderStatus[] = ["PENDING_PAYMENT", "PAID", "ORDERED", "READY", "DELIVERED"];

/** Referência para o descritivo da transferência (ex.: KFS-ENC-0012). */
export function orderReference(number: number): string {
  return `KFS-ENC-${String(number).padStart(4, "0")}`;
}

export type OrderLine = {
  id: string;
  variantId: string;
  productId: string;
  productName: string;
  size: string | null;
  color: string | null;
  fit?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  recipientNote: string | null;
  /** Foto da cor da peça (ou a principal do produto). */
  imageUrl: string | null;
};

export type RetailOrder = {
  id: string;
  number: number;
  schoolId: string | null;
  studentId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  status: OrderStatus;
  totalAmount: number;
  /** Antes do desconto (null em encomendas antigas = igual ao total). */
  subtotalAmount: number | null;
  discountAmount: number;
  discountLabel: string | null;
  couponCode: string | null;
  paymentMethod: string | null;
  paidAt: string | null;
  saleId: string | null;
  orderedAt: string | null;
  readyAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  proofPath: string | null;
  proofFileName: string | null;
  proofUploadedAt: string | null;
  notes: string | null;
  createdAt: string;
  lines: OrderLine[];
};

const ORDER_COLUMNS =
  'id, number, schoolId, studentId, customerName, customerPhone, status, totalAmount, subtotalAmount, discountAmount, discountLabel, couponCode, paymentMethod, paidAt, saleId, orderedAt, readyAt, deliveredAt, cancelledAt, proofPath, proofFileName, proofUploadedAt, notes, createdAt';

type OrderRow = Omit<RetailOrder, "lines" | "totalAmount" | "number" | "subtotalAmount" | "discountAmount"> & {
  totalAmount: number | string;
  number: number | string;
  subtotalAmount: number | string | null;
  discountAmount: number | string | null;
};

export function lineLabel(l: Pick<OrderLine, "size" | "color" | "fit">): string {
  return [l.fit, l.color, l.size].filter(Boolean).join(" · ") || "Único";
}

/** Carrega encomendas (com linhas, produto e variante). */
export async function loadOrders(
  supabase: SupabaseClient,
  filter: { studentId?: string; ids?: string[]; statuses?: OrderStatus[]; limit?: number } = {}
): Promise<RetailOrder[]> {
  let q = supabase.from("RetailOrder").select(ORDER_COLUMNS).order("createdAt", { ascending: false }).limit(filter.limit ?? 300);
  if (filter.studentId) q = q.eq("studentId", filter.studentId);
  if (filter.ids) q = q.in("id", filter.ids.length ? filter.ids : ["-"]);
  if (filter.statuses) q = q.in("status", filter.statuses);
  const { data: rows } = await q;
  const orders = (rows ?? []) as unknown as OrderRow[];
  if (orders.length === 0) return [];

  const { data: lineRows } = await supabase
    .from("RetailOrderLine")
    .select("id, orderId, variantId, quantity, unitPrice, lineTotal, recipientNote")
    .in("orderId", orders.map((o) => o.id));
  const lines = (lineRows ?? []) as { id: string; orderId: string; variantId: string; quantity: number; unitPrice: number | string; lineTotal: number | string; recipientNote: string | null }[];

  const variantIds = [...new Set(lines.map((l) => l.variantId))];
  const { data: variants } = variantIds.length
    ? await supabase.from("ProductVariant").select("id, productId, size, color, fit").in("id", variantIds)
    : { data: [] };
  const variantById = new Map(((variants ?? []) as { id: string; productId: string; size: string | null; color: string | null; fit: string | null }[]).map((v) => [v.id, v]));
  const productIds = [...new Set([...variantById.values()].map((v) => v.productId))];
  const { data: products } = productIds.length ? await supabase.from("Product").select("id, name, images").in("id", productIds) : { data: [] };
  const productName = new Map(((products ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name]));
  const productImages = new Map(((products ?? []) as { id: string; images?: unknown }[]).map((p) => [p.id, parseProductImages(p.images)]));

  return orders.map((o) => ({
    ...o,
    number: Number(o.number),
    totalAmount: Number(o.totalAmount),
    subtotalAmount: o.subtotalAmount != null ? Number(o.subtotalAmount) : null,
    discountAmount: Number(o.discountAmount ?? 0),
    lines: lines
      .filter((l) => l.orderId === o.id)
      .map((l) => {
        const v = variantById.get(l.variantId);
        return {
          id: l.id,
          variantId: l.variantId,
          productId: v?.productId ?? "",
          productName: v ? productName.get(v.productId) ?? "Produto" : "Produto",
          size: v?.size ?? null,
          color: v?.color ?? null,
          fit: v?.fit ?? null,
          quantity: l.quantity,
          unitPrice: Number(l.unitPrice),
          lineTotal: Number(l.lineTotal),
          recipientNote: l.recipientNote,
          imageUrl: v ? imageForColor(productImages.get(v.productId) ?? [], v.color) : null,
        };
      }),
  }));
}

export type PreorderVariant = { id: string; size: string | null; color: string | null; fit: string | null; price: number };
export type PreorderProduct = { id: string; name: string; description: string | null; schoolId: string | null; images: ProductImage[]; variants: PreorderVariant[] };

/** Produtos ativos com pré-encomenda e as suas variantes ativas (preço efetivo). */
export async function loadPreorderProducts(supabase: SupabaseClient, opts: { productId?: string; schoolId?: string | null } = {}): Promise<PreorderProduct[]> {
  let q = supabase.from("Product").select("id, name, description, salePrice, schoolId, images").eq("isActive", true).eq("allowPreorder", true).order("name");
  if (opts.productId) q = q.eq("id", opts.productId);
  const { data: rows } = await q;
  const products = ((rows ?? []) as { id: string; name: string; description: string | null; salePrice: number | string; schoolId: string | null; images?: unknown }[]).filter(
    (p) => opts.schoolId === undefined || p.schoolId == null || p.schoolId === opts.schoolId
  );
  if (products.length === 0) return [];
  const { data: vRows } = await supabase
    .from("ProductVariant")
    .select("id, productId, size, color, fit, priceOverride")
    .in("productId", products.map((p) => p.id))
    .eq("isActive", true);
  const variants = (vRows ?? []) as { id: string; productId: string; size: string | null; color: string | null; fit: string | null; priceOverride: number | string | null }[];
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    schoolId: p.schoolId,
    images: parseProductImages(p.images),
    variants: variants
      .filter((v) => v.productId === p.id)
      .map((v) => ({ id: v.id, size: v.size, color: v.color, fit: v.fit ?? null, price: Number(v.priceOverride ?? p.salePrice) })),
  }));
}

export type OrderLineInput = { variantId: string; quantity: number; recipientNote?: string | null };

/**
 * Cria a encomenda (estado «Por pagar»). Preços vêm sempre da base de dados, nunca do cliente.
 * Só aceita variantes de produtos com pré-encomenda ativa.
 */
export async function createRetailOrder(
  supabase: SupabaseClient,
  input: {
    lines: OrderLineInput[];
    schoolId: string | null;
    studentId?: string | null;
    customerName?: string | null;
    customerPhone?: string | null;
    notes?: string | null;
    createdByUserId?: string | null;
    couponCode?: string | null;
  }
): Promise<{ error?: string; id?: string; number?: number }> {
  const lines = input.lines.filter((l) => l.variantId && l.quantity > 0);
  if (lines.length === 0) return { error: "Adiciona pelo menos uma peça." };
  if (lines.some((l) => !Number.isInteger(l.quantity) || l.quantity > 20)) return { error: "Quantidade inválida." };

  const products = await loadPreorderProducts(supabase);
  const variantInfo = new Map<string, { price: number; schoolId: string | null; productId: string }>();
  for (const p of products) for (const v of p.variants) variantInfo.set(v.id, { price: v.price, schoolId: p.schoolId, productId: p.id });
  if (lines.some((l) => !variantInfo.has(l.variantId))) return { error: "Este artigo já não está disponível para encomenda." };

  const id = crypto.randomUUID();
  const lineRows = lines.map((l) => {
    const unit = variantInfo.get(l.variantId)!.price;
    return {
      id: crypto.randomUUID(),
      orderId: id,
      variantId: l.variantId,
      quantity: l.quantity,
      unitPrice: unit.toFixed(2),
      lineTotal: (Math.round(unit * l.quantity * 100) / 100).toFixed(2),
      recipientNote: l.recipientNote?.trim().slice(0, 80) || null,
    };
  });
  // Desconto recalculado aqui (nunca confiar no valor do browser): o melhor entre promoção e cupão.
  const coupon = input.couponCode?.trim() ? await findActiveCoupon(supabase, input.couponCode) : null;
  if (input.couponCode?.trim() && !coupon) return { error: "Cupão inválido ou já não está ativo." };
  const promotions = await loadActivePromotions(supabase);
  const d = computeDiscount(
    lineRows.map((l) => ({ productId: variantInfo.get(l.variantId)!.productId, quantity: l.quantity, lineTotal: Number(l.lineTotal) })),
    promotions,
    coupon
  );
  const total = d.total;

  const { data: created, error } = await supabase
    .from("RetailOrder")
    .insert({
      id,
      schoolId: input.schoolId,
      studentId: input.studentId ?? null,
      customerName: input.customerName?.trim() || null,
      customerPhone: input.customerPhone?.trim() || null,
      status: "PENDING_PAYMENT",
      totalAmount: total.toFixed(2),
      subtotalAmount: d.subtotal.toFixed(2),
      discountAmount: d.discount.toFixed(2),
      discountLabel: d.label,
      couponCode: d.couponCode,
      promotionId: d.promotionId,
      notes: input.notes?.trim() || null,
      createdByUserId: input.createdByUserId ?? null,
    })
    .select("number")
    .single();
  if (error) return { error: error.message };
  const { error: lErr } = await supabase.from("RetailOrderLine").insert(lineRows);
  if (lErr) {
    await supabase.from("RetailOrder").delete().eq("id", id);
    return { error: lErr.message };
  }
  return { id, number: Number((created as { number: number | string }).number) };
}

/** Resumo para o fornecedor: peças das encomendas pagas, por produto e cor → tamanho → quantidade. */
export function supplierSummary(orders: RetailOrder[]): { product: string; color: string | null; sizes: { size: string; qty: number }[]; total: number }[] {
  const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"];
  const groups = new Map<string, { product: string; color: string | null; sizes: Map<string, number> }>();
  for (const o of orders) {
    if (o.status !== "PAID") continue;
    for (const l of o.lines) {
      const productLabel = l.fit ? `${l.productName} — ${l.fit}` : l.productName;
      const key = `${productLabel}|${l.color ?? ""}`;
      const g = groups.get(key) ?? { product: productLabel, color: l.color, sizes: new Map() };
      const size = l.size ?? "Único";
      g.sizes.set(size, (g.sizes.get(size) ?? 0) + l.quantity);
      groups.set(key, g);
    }
  }
  const rank = (s: string) => {
    const i = SIZE_ORDER.indexOf(s.toUpperCase());
    return i === -1 ? 100 : i;
  };
  return [...groups.values()].map((g) => {
    const sizes = [...g.sizes.entries()].map(([size, qty]) => ({ size, qty })).sort((a, b) => rank(a.size) - rank(b.size) || a.size.localeCompare(b.size));
    return { product: g.product, color: g.color, sizes, total: sizes.reduce((a, s) => a + s.qty, 0) };
  });
}
