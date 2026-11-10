import type { Metadata } from "next";

export const SITE_NAME = "Kingdom Fight School";

/**
 * Metadados de uma página pública: título, descrição, canónico e pré-visualização
 * nas redes (Open Graph + Twitter). A imagem vem de app/opengraph-image.tsx,
 * exceto quando a página passa uma própria (ex.: foto do produto).
 */
export function publicPageMetadata(opts: {
  title: string;
  description: string;
  path: string;
  image?: string | null;
}): Metadata {
  const images = opts.image ? [{ url: opts.image, alt: opts.title }] : undefined;
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: opts.path },
    openGraph: {
      title: opts.title,
      description: opts.description,
      url: opts.path,
      siteName: SITE_NAME,
      locale: "pt_PT",
      type: "website",
      ...(images ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
      ...(images ? { images: images.map((i) => i.url) } : {}),
    },
  };
}
