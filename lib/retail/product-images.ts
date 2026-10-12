/** Fotos dos produtos (coluna Product.images): a primeira é a principal; `color` liga a foto a uma cor. */
export type ProductImage = { url: string; color: string | null };

export const MAX_PRODUCT_IMAGES = 4;

export function parseProductImages(raw: unknown): ProductImage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => {
      const r = x as { url?: unknown; color?: unknown };
      return typeof r?.url === "string" && r.url ? { url: r.url, color: typeof r.color === "string" && r.color ? r.color : null } : null;
    })
    .filter((x): x is ProductImage => x !== null)
    .slice(0, MAX_PRODUCT_IMAGES);
}

/** Foto da cor escolhida; sem foto dessa cor (ou sem cor), a principal. */
export function imageForColor(images: ProductImage[], color: string | null | undefined): string | null {
  if (images.length === 0) return null;
  const match = color ? images.find((i) => i.color === color) : undefined;
  return (match ?? images[0]).url;
}

/** Só aceita URLs do nosso bucket público (evita guardar links externos arbitrários). */
export function isOwnProductImageUrl(url: string): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  return Boolean(base) && url.startsWith(`${base}/storage/v1/object/public/product-images/`);
}

/** Caminho no bucket a partir do URL público (para apagar o ficheiro). */
export function productImagePath(url: string): string | null {
  const i = url.indexOf("/product-images/");
  return i === -1 ? null : url.slice(i + "/product-images/".length);
}
