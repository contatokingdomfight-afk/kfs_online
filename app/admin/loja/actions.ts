"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRODUCT_CATEGORIES, type ProductCategory, PAYMENT_METHODS, type RetailPaymentMethod } from "@/lib/retail/constants";
import { recordStockMovement } from "@/lib/retail/inventory";
import { createRetailSale } from "@/lib/retail/sales";
import { searchStudentIdsByQuery } from "@/lib/admin-search-students";

export type ActionResult = { error?: string; success?: boolean; id?: string };

function requireAdmin() {
  return getCurrentDbUser().then((u) => {
    if (!u || u.role !== "ADMIN") return null;
    return u;
  });
}

export async function createSupplier(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const dbUser = await requireAdmin();
  if (!dbUser) return { error: "Não autorizado." };

  const name = (formData.get("name") as string)?.trim();
  const contact = (formData.get("contact") as string)?.trim() || null;
  const taxId = (formData.get("taxId") as string)?.trim() || null;
  if (!name) return { error: "Nome do fornecedor é obrigatório." };

  const supabase = createAdminClient();
  const id = crypto.randomUUID();
  const { error } = await supabase.from("ProductSupplier").insert({
    id,
    name,
    contact,
    tax_id: taxId,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/loja/produtos");
  return { success: true, id };
}

export async function createProduct(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const dbUser = await requireAdmin();
  if (!dbUser) return { error: "Não autorizado." };

  const name = (formData.get("name") as string)?.trim();
  const sku = (formData.get("sku") as string)?.trim();
  const category = (formData.get("category") as string)?.trim() as ProductCategory;
  const salePriceStr = (formData.get("salePrice") as string)?.trim();
  const supplierId = (formData.get("supplierId") as string)?.trim() || null;
  const schoolId = (formData.get("schoolId") as string)?.trim() || null;
  const description = (formData.get("description") as string)?.trim() || null;
  const variantSku = (formData.get("variantSku") as string)?.trim() || sku;
  const size = (formData.get("size") as string)?.trim() || null;
  const color = (formData.get("color") as string)?.trim() || null;

  if (!name || !sku) return { error: "Nome e SKU são obrigatórios." };
  if (!PRODUCT_CATEGORIES.includes(category)) return { error: "Categoria inválida." };
  const salePrice = parseFloat(salePriceStr ?? "");
  if (Number.isNaN(salePrice) || salePrice < 0) return { error: "Preço inválido." };

  const supabase = createAdminClient();
  const productId = crypto.randomUUID();
  const { error: pErr } = await supabase.from("Product").insert({
    id: productId,
    name,
    sku,
    category,
    salePrice: salePrice.toFixed(2),
    supplierId,
    schoolId,
    description,
    isActive: true,
  });
  if (pErr) return { error: pErr.message };

  const variantId = crypto.randomUUID();
  const { error: vErr } = await supabase.from("ProductVariant").insert({
    id: variantId,
    productId,
    sku: variantSku,
    size,
    color,
    isActive: true,
  });
  if (vErr) {
    await supabase.from("Product").delete().eq("id", productId);
    return { error: vErr.message };
  }

  revalidatePath("/admin/loja/produtos");
  return { success: true, id: productId };
}

export async function addProductVariant(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const dbUser = await requireAdmin();
  if (!dbUser) return { error: "Não autorizado." };

  const productId = (formData.get("productId") as string)?.trim();
  const sku = (formData.get("sku") as string)?.trim();
  const size = (formData.get("size") as string)?.trim() || null;
  const color = (formData.get("color") as string)?.trim() || null;
  const priceOverrideStr = (formData.get("priceOverride") as string)?.trim();
  if (!productId || !sku) return { error: "Produto e SKU são obrigatórios." };

  let priceOverride: number | null = null;
  if (priceOverrideStr) {
    const p = parseFloat(priceOverrideStr);
    if (Number.isNaN(p) || p < 0) return { error: "Preço override inválido." };
    priceOverride = p;
  }

  const supabase = createAdminClient();
  const id = crypto.randomUUID();
  const { error } = await supabase.from("ProductVariant").insert({
    id,
    productId,
    sku,
    size,
    color,
    priceOverride: priceOverride != null ? priceOverride.toFixed(2) : null,
    isActive: true,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/loja/produtos");
  return { success: true, id };
}

export async function toggleProductActive(formData: FormData) {
  const dbUser = await requireAdmin();
  if (!dbUser) redirect("/dashboard");
  const id = (formData.get("id") as string)?.trim();
  const isActive = formData.get("isActive") === "true";
  if (!id) return;
  const supabase = createAdminClient();
  await supabase.from("Product").update({ isActive, updatedAt: new Date().toISOString() }).eq("id", id);
  revalidatePath("/admin/loja/produtos");
}

export async function recordStockIn(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const dbUser = await requireAdmin();
  if (!dbUser) return { error: "Não autorizado." };

  const variantId = (formData.get("variantId") as string)?.trim();
  const schoolId = (formData.get("schoolId") as string)?.trim();
  const quantityStr = (formData.get("quantity") as string)?.trim();
  const unitCostStr = (formData.get("unitCost") as string)?.trim();
  const notes = (formData.get("notes") as string)?.trim() || null;
  const reorderLevelStr = (formData.get("reorderLevel") as string)?.trim();

  const quantity = parseInt(quantityStr ?? "", 10);
  if (!variantId || !schoolId) return { error: "Variante e escola são obrigatórios." };
  if (Number.isNaN(quantity) || quantity < 1) return { error: "Quantidade inválida." };

  let unitCost: number | null = null;
  if (unitCostStr) {
    const c = parseFloat(unitCostStr);
    if (!Number.isNaN(c) && c >= 0) unitCost = c;
  }

  const supabase = createAdminClient();
  const result = await recordStockMovement(supabase, {
    variantId,
    schoolId,
    movementType: "IN",
    quantity,
    unitCost,
    notes,
    createdByUserId: dbUser.id,
  });
  if (result.error) return { error: result.error };

  if (reorderLevelStr) {
    const reorderLevel = parseInt(reorderLevelStr, 10);
    if (!Number.isNaN(reorderLevel) && reorderLevel >= 0) {
      const { data: bal } = await supabase
        .from("InventoryBalance")
        .select("id")
        .eq("variantId", variantId)
        .eq("schoolId", schoolId)
        .maybeSingle();
      if (bal?.id) {
        await supabase
          .from("InventoryBalance")
          .update({ reorderLevel, updatedAt: new Date().toISOString() })
          .eq("id", bal.id);
      }
    }
  }

  revalidatePath("/admin/loja/stock");
  revalidatePath("/admin/loja");
  return { success: true };
}

export async function recordStockAdjust(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const dbUser = await requireAdmin();
  if (!dbUser) return { error: "Não autorizado." };

  const variantId = (formData.get("variantId") as string)?.trim();
  const schoolId = (formData.get("schoolId") as string)?.trim();
  const newQuantityStr = (formData.get("newQuantity") as string)?.trim();
  const notes = (formData.get("notes") as string)?.trim() || null;

  const newQuantity = parseInt(newQuantityStr ?? "", 10);
  if (!variantId || !schoolId) return { error: "Variante e escola são obrigatórios." };
  if (Number.isNaN(newQuantity) || newQuantity < 0) return { error: "Quantidade inválida." };

  const supabase = createAdminClient();
  const result = await recordStockMovement(supabase, {
    variantId,
    schoolId,
    movementType: "ADJUST",
    quantity: newQuantity,
    notes,
    createdByUserId: dbUser.id,
  });
  if (result.error) return { error: result.error };
  revalidatePath("/admin/loja/stock");
  revalidatePath("/admin/loja");
  return { success: true };
}

export type PosLineInput = { variantId: string; quantity: number; unitPrice: number };

export async function registerRetailSale(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const dbUser = await requireAdmin();
  if (!dbUser) return { error: "Não autorizado." };

  const schoolId = (formData.get("schoolId") as string)?.trim();
  const paymentMethod = (formData.get("paymentMethod") as string)?.trim() as RetailPaymentMethod;
  const studentId = (formData.get("studentId") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;
  const linesJson = (formData.get("lines") as string)?.trim();

  if (!schoolId) return { error: "Escola é obrigatória." };
  if (!PAYMENT_METHODS.includes(paymentMethod)) return { error: "Método de pagamento inválido." };

  let lines: PosLineInput[];
  try {
    lines = JSON.parse(linesJson ?? "[]") as PosLineInput[];
  } catch {
    return { error: "Linhas de venda inválidas." };
  }

  const supabase = createAdminClient();
  const result = await createRetailSale(supabase, {
    schoolId,
    paymentMethod,
    lines,
    studentId,
    registeredByUserId: dbUser.id,
    notes,
  });
  if (result.error) return { error: result.error };

  revalidatePath("/admin/loja/vendas");
  revalidatePath("/admin/loja");
  revalidatePath("/admin/financeiro");
  redirect(`/admin/loja/vendas?ok=1`);
}

export async function searchStudentsForRetail(query: string): Promise<{ error?: string; results?: { id: string; name: string }[] }> {
  const dbUser = await requireAdmin();
  if (!dbUser) return { error: "Não autorizado." };
  const q = query.trim();
  if (q.length < 2) return { error: "Indica pelo menos 2 caracteres." };

  const supabase = createAdminClient();
  const ids = await searchStudentIdsByQuery(supabase, q);
  if (!ids.length) return { results: [] };

  const { data: students } = await supabase.from("Student").select("id, userId").in("id", ids.slice(0, 20));
  const userIds = [...new Set((students ?? []).map((s) => (s as { userId: string }).userId))];
  const { data: users } = await supabase.from("User").select("id, name, email").in("id", userIds);
  const userById = new Map((users ?? []).map((u) => [(u as { id: string }).id, u]));

  const results = (students ?? []).map((s) => {
    const st = s as { id: string; userId: string };
    const u = userById.get(st.userId) as { name?: string | null; email?: string } | undefined;
    return { id: st.id, name: u?.name || u?.email || st.id };
  });
  results.sort((a, b) => a.name.localeCompare(b.name, "pt"));
  return { results };
}

export async function searchVariantsAction(query: string) {
  const dbUser = await requireAdmin();
  if (!dbUser) return { error: "Não autorizado.", variants: [] };
  const { searchVariantsForSale } = await import("@/lib/retail/catalog");
  const supabase = createAdminClient();
  const variants = await searchVariantsForSale(supabase, query);
  return { variants };
}
