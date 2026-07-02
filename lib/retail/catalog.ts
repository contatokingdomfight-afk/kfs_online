import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProductCategory } from "@/lib/retail/constants";
import type { ProductRow, ProductSupplierRow, ProductVariantRow, VariantWithProduct } from "@/lib/retail/types";

function effectivePrice(variant: ProductVariantRow, product: ProductRow): number {
  return variant.priceOverride ?? product.salePrice;
}

function variantLabel(variant: ProductVariantRow): string {
  const parts = [variant.size, variant.color].filter(Boolean);
  return parts.length ? parts.join(" / ") : "Único";
}

export async function listSuppliers(supabase: SupabaseClient): Promise<ProductSupplierRow[]> {
  const { data } = await supabase
    .from("ProductSupplier")
    .select("id, name, contact, tax_id")
    .order("name", { ascending: true });
  return (data ?? []).map((r) => ({
    id: (r as { id: string }).id,
    name: (r as { name: string }).name,
    contact: (r as { contact?: string | null }).contact ?? null,
    taxId: (r as { tax_id?: string | null }).tax_id ?? null,
  }));
}

export async function listProducts(
  supabase: SupabaseClient,
  options?: { activeOnly?: boolean }
): Promise<ProductRow[]> {
  let q = supabase
    .from("Product")
    .select("id, name, sku, category, salePrice, supplierId, schoolId, isActive, description")
    .order("name", { ascending: true });
  if (options?.activeOnly) q = q.eq("isActive", true);
  const { data } = await q;
  return (data ?? []).map((r) => ({
    id: (r as { id: string }).id,
    name: (r as { name: string }).name,
    sku: (r as { sku: string }).sku,
    category: (r as { category: ProductCategory }).category,
    salePrice: Number((r as { salePrice: number }).salePrice),
    supplierId: (r as { supplierId?: string | null }).supplierId ?? null,
    schoolId: (r as { schoolId?: string | null }).schoolId ?? null,
    isActive: Boolean((r as { isActive: boolean }).isActive),
    description: (r as { description?: string | null }).description ?? null,
  }));
}

export async function getProductWithVariants(
  supabase: SupabaseClient,
  productId: string
): Promise<{ product: ProductRow | null; variants: ProductVariantRow[] }> {
  const { data: product } = await supabase
    .from("Product")
    .select("id, name, sku, category, salePrice, supplierId, schoolId, isActive, description")
    .eq("id", productId)
    .maybeSingle();
  if (!product) return { product: null, variants: [] };

  const { data: variants } = await supabase
    .from("ProductVariant")
    .select("id, productId, sku, size, color, priceOverride, isActive")
    .eq("productId", productId)
    .order("sku", { ascending: true });

  const p = product as {
    id: string;
    name: string;
    sku: string;
    category: ProductCategory;
    salePrice: number;
    supplierId?: string | null;
    schoolId?: string | null;
    isActive: boolean;
    description?: string | null;
  };

  return {
    product: {
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category,
      salePrice: Number(p.salePrice),
      supplierId: p.supplierId ?? null,
      schoolId: p.schoolId ?? null,
      isActive: p.isActive,
      description: p.description ?? null,
    },
    variants: (variants ?? []).map((v) => ({
      id: (v as { id: string }).id,
      productId: (v as { productId: string }).productId,
      sku: (v as { sku: string }).sku,
      size: (v as { size?: string | null }).size ?? null,
      color: (v as { color?: string | null }).color ?? null,
      priceOverride: (v as { priceOverride?: number | null }).priceOverride != null
        ? Number((v as { priceOverride: number }).priceOverride)
        : null,
      isActive: Boolean((v as { isActive: boolean }).isActive),
    })),
  };
}

/** Variantes activas com preço efectivo (para POS e pesquisa). */
export async function searchVariantsForSale(
  supabase: SupabaseClient,
  query: string,
  limit = 30
): Promise<VariantWithProduct[]> {
  const q = query.trim().toLowerCase();
  const { data: products } = await supabase
    .from("Product")
    .select("id, name, sku, category, salePrice")
    .eq("isActive", true);
  if (!products?.length) return [];

  const productIds = products.map((p) => (p as { id: string }).id);
  const { data: variants } = await supabase
    .from("ProductVariant")
    .select("id, productId, sku, size, color, priceOverride, isActive")
    .in("productId", productIds)
    .eq("isActive", true);

  const productById = new Map(
    products.map((p) => {
      const row = p as { id: string; name: string; sku: string; category: ProductCategory; salePrice: number };
      return [row.id, row];
    })
  );

  const results: VariantWithProduct[] = [];
  for (const v of variants ?? []) {
    const variant = v as ProductVariantRow;
    const product = productById.get(variant.productId);
    if (!product) continue;
    const prodRow: ProductRow = {
      id: product.id,
      name: product.name,
      sku: product.sku,
      category: product.category,
      salePrice: Number(product.salePrice),
      supplierId: null,
      schoolId: null,
      isActive: true,
      description: null,
    };
    const label = `${product.name} ${variantLabel(variant)} ${variant.sku}`.toLowerCase();
    if (q && !label.includes(q) && !product.name.toLowerCase().includes(q) && !variant.sku.toLowerCase().includes(q)) {
      continue;
    }
    results.push({
      ...variant,
      productName: product.name,
      productSku: product.sku,
      category: product.category,
      baseSalePrice: Number(product.salePrice),
      effectivePrice: effectivePrice(variant, prodRow),
    });
    if (results.length >= limit) break;
  }
  return results.sort((a, b) => a.productName.localeCompare(b.productName, "pt"));
}

export { variantLabel, effectivePrice };
