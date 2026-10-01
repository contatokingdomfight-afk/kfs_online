import { getLocalBusinessJsonLd } from "@/lib/local-business-jsonld";
import { getPublicOrigin } from "@/lib/site-public-url";
import type { ModalidadeContent } from "@/lib/modalidades-content";

/** Service + FAQPage JSON-LD gerados a partir do conteúdo real da própria página — nunca inventa perguntas. */
export function ModalidadeJsonLd({ content }: { content: ModalidadeContent }) {
  const origin = getPublicOrigin();
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        name: content.name,
        description: content.metaDescription,
        url: `${origin}${content.path}`,
        areaServed: "Sintra, Portugal",
        provider: getLocalBusinessJsonLd(),
      },
      {
        "@type": "FAQPage",
        mainEntity: content.faqItems.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
