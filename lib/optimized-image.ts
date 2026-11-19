/**
 * Imagens do Storage do Supabase servidas pelo otimizador da Vercel (/_next/image):
 * redimensiona, converte para WebP e guarda em cache na Vercel, por isso o Supabase entrega cada
 * original uma só vez (poupa o «Cached Egress» do plano gratuito).
 * Só reescreve URLs públicos do Storage (*.supabase.co/storage/v1/object/public/…); o resto fica igual.
 */

/** Larguras aceites pelo /_next/image por omissão (imageSizes + deviceSizes do Next). */
const ALLOWED_WIDTHS = [16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840];

function isSupabasePublicStorage(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname.endsWith(".supabase.co") && u.pathname.startsWith("/storage/v1/object/public/");
  } catch {
    return false;
  }
}

function snapWidth(w: number): number {
  return ALLOWED_WIDTHS.find((x) => x >= w) ?? ALLOWED_WIDTHS[ALLOWED_WIDTHS.length - 1];
}

/** URL otimizado para mostrar com a largura dada (em px reais). */
export function optimizedImageSrc(url: string | null | undefined, width: number, quality = 70): string {
  if (!url) return "";
  if (!isSupabasePublicStorage(url)) return url;
  return `/_next/image?url=${encodeURIComponent(url)}&w=${snapWidth(width)}&q=${quality}`;
}

/** srcSet 1x/2x para uma imagem mostrada com `cssWidth` px. */
export function optimizedImageSrcSet(url: string | null | undefined, cssWidth: number, quality = 70): string | undefined {
  if (!url || !isSupabasePublicStorage(url)) return undefined;
  return `${optimizedImageSrc(url, cssWidth, quality)} 1x, ${optimizedImageSrc(url, cssWidth * 2, quality)} 2x`;
}
