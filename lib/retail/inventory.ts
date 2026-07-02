import type { SupabaseClient } from "@supabase/supabase-js";
import type { StockMovementType } from "@/lib/retail/constants";
import type { InventoryBalanceRow, LowStockItem, StockMovementRow } from "@/lib/retail/types";

async function getOrCreateBalance(
  supabase: SupabaseClient,
  variantId: string,
  schoolId: string
): Promise<{ id: string; quantityOnHand: number }> {
  const { data: existing } = await supabase
    .from("InventoryBalance")
    .select("id, quantityOnHand")
    .eq("variantId", variantId)
    .eq("schoolId", schoolId)
    .maybeSingle();

  if (existing?.id) {
    return {
      id: (existing as { id: string }).id,
      quantityOnHand: Number((existing as { quantityOnHand: number }).quantityOnHand),
    };
  }

  const id = crypto.randomUUID();
  const { error } = await supabase.from("InventoryBalance").insert({
    id,
    variantId,
    schoolId,
    quantityOnHand: 0,
    reorderLevel: 0,
  });
  if (error) throw new Error(error.message);
  return { id, quantityOnHand: 0 };
}

export async function getBalance(
  supabase: SupabaseClient,
  variantId: string,
  schoolId: string
): Promise<number> {
  const { data } = await supabase
    .from("InventoryBalance")
    .select("quantityOnHand")
    .eq("variantId", variantId)
    .eq("schoolId", schoolId)
    .maybeSingle();
  return data ? Number((data as { quantityOnHand: number }).quantityOnHand) : 0;
}

export type RecordStockMovementInput = {
  variantId: string;
  schoolId: string;
  movementType: StockMovementType;
  quantity: number;
  unitCost?: number | null;
  referenceType?: string | null;
  referenceId?: string | null;
  notes?: string | null;
  createdByUserId?: string | null;
};

export async function recordStockMovement(
  supabase: SupabaseClient,
  input: RecordStockMovementInput
): Promise<{ error?: string }> {
  const { variantId, schoolId, movementType, unitCost, referenceType, referenceId, notes, createdByUserId } =
    input;
  let quantity = input.quantity;

  if (quantity <= 0 && movementType !== "ADJUST") {
    return { error: "Quantidade deve ser positiva." };
  }

  const balance = await getOrCreateBalance(supabase, variantId, schoolId);
  let delta = quantity;
  let movementQty = quantity;

  if (movementType === "OUT") {
    if (balance.quantityOnHand < quantity) {
      return { error: `Stock insuficiente (disponível: ${balance.quantityOnHand}).` };
    }
    delta = -quantity;
  } else if (movementType === "ADJUST") {
    delta = quantity - balance.quantityOnHand;
    movementQty = Math.abs(delta);
    if (movementQty === 0) return {};
  }

  const newQty = balance.quantityOnHand + delta;
  if (newQty < 0) return { error: "Operação deixaria stock negativo." };

  const movementId = crypto.randomUUID();
  const { error: movErr } = await supabase.from("StockMovement").insert({
    id: movementId,
    variantId,
    schoolId,
    movementType,
    quantity: movementType === "ADJUST" ? movementQty : quantity,
    unitCost: unitCost ?? null,
    referenceType: referenceType ?? null,
    referenceId: referenceId ?? null,
    notes: notes ?? null,
    createdByUserId: createdByUserId ?? null,
  });
  if (movErr) return { error: movErr.message };

  const { error: balErr } = await supabase
    .from("InventoryBalance")
    .update({ quantityOnHand: newQty, updatedAt: new Date().toISOString() })
    .eq("id", balance.id);
  if (balErr) return { error: balErr.message };

  return {};
}

export async function listLowStock(
  supabase: SupabaseClient,
  schoolId?: string
): Promise<LowStockItem[]> {
  let q = supabase
    .from("InventoryBalance")
    .select("variantId, schoolId, quantityOnHand, reorderLevel")
    .gt("reorderLevel", 0);
  if (schoolId) q = q.eq("schoolId", schoolId);
  const { data: balances } = await q;

  const low = (balances ?? []).filter(
    (b) => Number((b as { quantityOnHand: number }).quantityOnHand) <= Number((b as { reorderLevel: number }).reorderLevel)
  );
  if (!low.length) return [];

  const variantIds = [...new Set(low.map((b) => (b as { variantId: string }).variantId))];
  const schoolIds = [...new Set(low.map((b) => (b as { schoolId: string }).schoolId))];

  const [{ data: variants }, { data: schools }] = await Promise.all([
    supabase
      .from("ProductVariant")
      .select("id, productId, sku, size, color, priceOverride, isActive")
      .in("id", variantIds),
    supabase.from("School").select("id, name").in("id", schoolIds),
  ]);

  const productIds = [...new Set((variants ?? []).map((v) => (v as { productId: string }).productId))];
  const { data: products } = await supabase
    .from("Product")
    .select("id, name, sku, category, salePrice")
    .in("id", productIds);

  const productById = new Map((products ?? []).map((p) => [(p as { id: string }).id, p]));
  const variantById = new Map((variants ?? []).map((v) => [(v as { id: string }).id, v]));
  const schoolById = new Map((schools ?? []).map((s) => [(s as { id: string }).id, s]));

  return low.map((b) => {
    const row = b as { variantId: string; schoolId: string; quantityOnHand: number; reorderLevel: number };
    const v = variantById.get(row.variantId) as {
      id: string;
      productId: string;
      sku: string;
      size: string | null;
      color: string | null;
      priceOverride: number | null;
      isActive: boolean;
    };
    const p = productById.get(v.productId) as { name: string; sku: string; category: string; salePrice: number };
    const school = schoolById.get(row.schoolId) as { name: string };
    return {
      id: v.id,
      productId: v.productId,
      sku: v.sku,
      size: v.size,
      color: v.color,
      priceOverride: v.priceOverride != null ? Number(v.priceOverride) : null,
      isActive: v.isActive,
      productName: p.name,
      productSku: p.sku,
      category: p.category as LowStockItem["category"],
      baseSalePrice: Number(p.salePrice),
      effectivePrice: v.priceOverride != null ? Number(v.priceOverride) : Number(p.salePrice),
      schoolId: row.schoolId,
      schoolName: school?.name ?? row.schoolId,
      quantityOnHand: row.quantityOnHand,
      reorderLevel: row.reorderLevel,
    };
  });
}

export async function listRecentMovements(
  supabase: SupabaseClient,
  options?: { schoolId?: string; limit?: number }
): Promise<StockMovementRow[]> {
  const limit = options?.limit ?? 50;
  let q = supabase
    .from("StockMovement")
    .select("id, variantId, schoolId, movementType, quantity, unitCost, referenceType, referenceId, notes, createdAt")
    .order("createdAt", { ascending: false })
    .limit(limit);
  if (options?.schoolId) q = q.eq("schoolId", options.schoolId);
  const { data } = await q;
  if (!data?.length) return [];

  const variantIds = [...new Set(data.map((m) => (m as { variantId: string }).variantId))];
  const schoolIds = [...new Set(data.map((m) => (m as { schoolId: string }).schoolId))];

  const { data: variants } = await supabase
    .from("ProductVariant")
    .select("id, sku, productId, size, color")
    .in("id", variantIds);
  const productIds = [...new Set((variants ?? []).map((v) => (v as { productId: string }).productId))];
  const [{ data: products }, { data: schools }] = await Promise.all([
    supabase.from("Product").select("id, name").in("id", productIds),
    supabase.from("School").select("id, name").in("id", schoolIds),
  ]);

  const productById = new Map((products ?? []).map((p) => [(p as { id: string }).id, p]));
  const variantById = new Map((variants ?? []).map((v) => [(v as { id: string }).id, v]));
  const schoolById = new Map((schools ?? []).map((s) => [(s as { id: string }).id, s]));

  return data.map((m) => {
    const row = m as StockMovementRow;
    const v = variantById.get(row.variantId) as { sku: string; productId: string };
    const p = productById.get(v?.productId);
    const school = schoolById.get(row.schoolId);
    return {
      ...row,
      quantity: Number(row.quantity),
      unitCost: row.unitCost != null ? Number(row.unitCost) : null,
      variantSku: v?.sku,
      productName: (p as { name?: string } | undefined)?.name,
      schoolName: (school as { name?: string } | undefined)?.name,
    };
  });
}

export async function setReorderLevel(
  supabase: SupabaseClient,
  variantId: string,
  schoolId: string,
  reorderLevel: number
): Promise<{ error?: string }> {
  const balance = await getOrCreateBalance(supabase, variantId, schoolId);
  const { error } = await supabase
    .from("InventoryBalance")
    .update({ reorderLevel, updatedAt: new Date().toISOString() })
    .eq("id", balance.id);
  if (error) return { error: error.message };
  return {};
}

export async function listBalancesForVariant(
  supabase: SupabaseClient,
  variantId: string
): Promise<InventoryBalanceRow[]> {
  const { data } = await supabase
    .from("InventoryBalance")
    .select("id, variantId, schoolId, quantityOnHand, reorderLevel")
    .eq("variantId", variantId);
  return (data ?? []).map((r) => ({
    id: (r as { id: string }).id,
    variantId: (r as { variantId: string }).variantId,
    schoolId: (r as { schoolId: string }).schoolId,
    quantityOnHand: Number((r as { quantityOnHand: number }).quantityOnHand),
    reorderLevel: Number((r as { reorderLevel: number }).reorderLevel),
  }));
}
