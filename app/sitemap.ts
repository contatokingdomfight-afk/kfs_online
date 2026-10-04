import type { MetadataRoute } from "next";
import { getPublicOrigin } from "@/lib/site-public-url";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { MODALIDADES_DYNAMIC_SLUGS, MODALIDADE_LANDING_SLUGS, getModalidadeContent } from "@/lib/modalidades-content";

async function getPublicCoachRoutes(origin: string, now: Date): Promise<MetadataRoute.Sitemap> {
  const admin = getAdminClientOrNull();
  if (!admin.client) return [];
  const { data: coaches } = await admin.client
    .from("Coach")
    .select("id")
    .eq("publicProfileEnabled", true)
    .eq("is_active", true);
  return (coaches ?? []).map((c) => ({
    url: `${origin}/t/c/${c.id as string}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  const coachRoutes = await getPublicCoachRoutes(origin, now);

  return [...staticRoutes, ...landingRoutes, ...modalidadeDynamicRoutes, ...coachRoutes];
}
