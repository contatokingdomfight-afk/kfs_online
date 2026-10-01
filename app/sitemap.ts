import type { MetadataRoute } from "next";
import { getPublicOrigin } from "@/lib/site-public-url";
import { MODALIDADES_DYNAMIC_SLUGS, MODALIDADE_LANDING_SLUGS, getModalidadeContent } from "@/lib/modalidades-content";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getPublicOrigin();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${origin}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${origin}/modalidades`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${origin}/aula-experimental`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${origin}/arbitragem`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${origin}/termos`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${origin}/privacidade`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  const landingRoutes: MetadataRoute.Sitemap = MODALIDADE_LANDING_SLUGS.map((slug) => ({
    url: `${origin}${getModalidadeContent("pt", slug).path}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const modalidadeDynamicRoutes: MetadataRoute.Sitemap = MODALIDADES_DYNAMIC_SLUGS.map((slug) => ({
    url: `${origin}/modalidades/${slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...landingRoutes, ...modalidadeDynamicRoutes];
}
