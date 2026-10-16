import type { SupabaseClient } from "@supabase/supabase-js";
import { PRODUCT_CATEGORIES, type ProductCategory } from "@/lib/retail/constants";
import { parseProductImages } from "@/lib/retail/product-images";

export function euro(n: number): string {
  return `€${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2).replace(".", ",")}`;
}

export type ShopProduct = {
  id: string;
  name: string;
  description: string | null;
  category: ProductCategory;
  minPrice: number;
  maxPrice: number;
  options: string[];
  inStock: boolean;
  preorder: boolean;
  imageUrl: string | null;
};

/**
 * Catálogo público (sem login): produtos ativos com preço, opções e se dá para encomendar.
 * Sem quantidades de stock; lido com o cliente admin porque as tabelas só são legíveis pela equipa.
 */
export async function loadShopProducts(admin: SupabaseClient, opts: { productId?: string } = {}): Promise<ShopProduct[]> {
  let q = admin.from("Product").select("id, name, description, category, salePrice, allowPreorder, images").eq("isActive", true).order("name", { ascending: true });
  if (opts.productId) q = q.eq("id", opts.productId);
  const { data: rows } = await q;
  const visible = (rows ?? []) as Array<{ id: string; name: string; description: string | null; category: ProductCategory; salePrice: number; allowPreorder?: boolean; images?: unknown }>;
  if (visible.length === 0) return [];
  const ids = visible.map((p) => p.id);
  const { data: variants } = await admin
    .from("ProductVariant")
    .select("id, productId, size, color, fit, priceOverride")
    .in("productId", ids)
    .eq("isActive", true);
  const variantIds = (variants ?? []).map((v) => v.id as string);
  const { data: balances } = variantIds.length
    ? await admin.from("InventoryBalance").select("variantId, quantityOnHand").in("variantId", variantIds)
    : { data: [] as { variantId: string; quantityOnHand: number }[] };
  const qty = new Map<string, number>();
  for (const b of balances ?? []) qty.set(b.variantId as string, (qty.get(b.variantId as string) ?? 0) + Number(b.quantityOnHand));

  return visible.map((p) => {
    const vs = (variants ?? []).filter((v) => v.productId === p.id);
    const prices = vs.length ? vs.map((v) => Number(v.priceOverride ?? p.salePrice)) : [Number(p.salePrice)];
    const options = [...new Set(vs.map((v) => [v.fit, v.size, v.color].filter(Boolean).join(" / ")).filter(Boolean))];
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      category: (PRODUCT_CATEGORIES as readonly string[]).includes(p.category) ? p.category : "ACESSORIO",
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      options,
      inStock: vs.some((v) => (qty.get(v.id as string) ?? 0) > 0),
      preorder: Boolean(p.allowPreorder) && vs.length > 0,
      imageUrl: parseProductImages(p.images)[0]?.url ?? null,
    };
  });
}

export type ShopCustomerProfile = {
  fullName: string;
  phone: string;
  addressLine: string;
  postalCode: string;
  city: string;
};

export async function loadShopProfile(admin: SupabaseClient, userId: string): Promise<ShopCustomerProfile | null> {
  const { data } = await admin
    .from("ShopCustomerProfile")
    .select("fullName, phone, addressLine, postalCode, city")
    .eq("userId", userId)
    .maybeSingle();
  return (data as ShopCustomerProfile | null) ?? null;
}

export function isProfileComplete(p: ShopCustomerProfile | null): p is ShopCustomerProfile {
  return Boolean(p && p.fullName.trim() && p.phone.trim() && p.addressLine.trim() && p.postalCode.trim() && p.city.trim());
}
