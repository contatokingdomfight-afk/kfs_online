import { getLocalBusinessJsonLd } from "@/lib/local-business-jsonld";

/** Montar em todas as páginas públicas rastreáveis (home, hub de modalidades, páginas de modalidade) — não no layout raiz, que também cobre admin/coach/dashboard. */
export function LocalBusinessJsonLd() {
  const data = getLocalBusinessJsonLd();
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
