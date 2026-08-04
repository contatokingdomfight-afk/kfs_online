import type { MetadataRoute } from "next";
import { getPublicOrigin } from "@/lib/site-public-url";

export default function robots(): MetadataRoute.Robots {
  const origin = getPublicOrigin();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/admin/",
        "/coach",
        "/coach/",
        "/dashboard",
        "/dashboard/",
        "/api/",
        "/auth/",
        "/onboarding",
        "/waiver-signing",
        "/escolher-plano",
        "/adesao",
      ],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
