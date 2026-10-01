import { GYM_ENROLLMENT_INFO } from "@/lib/enrollment-form";
import { getHomeContent } from "@/lib/home-content";
import { getPublicOrigin } from "@/lib/site-public-url";

/**
 * JSON-LD LocalBusiness com dados reais do projeto — sem inventar horário de
 * funcionamento ou avaliações, que não têm fonte fiável no código.
 */
export function getLocalBusinessJsonLd() {
  const home = getHomeContent("pt");
  return {
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    name: "Kingdom Fight School",
    legalName: GYM_ENROLLMENT_INFO.name,
    url: getPublicOrigin(),
    telephone: GYM_ENROLLMENT_INFO.phone,
    email: GYM_ENROLLMENT_INFO.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: "Praceta Laura Alves 8",
      postalCode: "2725-206",
      addressLocality: "Algueirão-Mem Martins",
      addressRegion: "Sintra",
      addressCountry: "PT",
    },
    sameAs: [home.youtubeUrl, home.instagramUrl].filter(Boolean),
  };
}
