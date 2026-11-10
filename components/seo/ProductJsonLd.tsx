import type { ShopProduct } from "@/lib/retail/public-shop";
import { getPublicOrigin } from "@/lib/site-public-url";

/** Dados estruturados de um produto da loja (preço e disponibilidade no Google). */
export function ProductJsonLd({ product, path }: { product: ShopProduct; path: string }) {
  const origin = getPublicOrigin();
  const url = `${origin}${path}`;
  const availability = product.inStock
    ? "https://schema.org/InStock"
    : product.preorder
      ? "https://schema.org/PreOrder"
      : "https://schema.org/OutOfStock";
  const seller = { "@type": "Organization", name: "Kingdom Fight School", url: origin };
  const offers =
    product.minPrice === product.maxPrice
      ? { "@type": "Offer", url, priceCurrency: "EUR", price: product.minPrice.toFixed(2), availability, seller }
      : {
          "@type": "AggregateOffer",
          url,
          priceCurrency: "EUR",
          lowPrice: product.minPrice.toFixed(2),
          highPrice: product.maxPrice.toFixed(2),
          availability,
          seller,
        };
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    ...(product.description ? { description: product.description } : {}),
    ...(product.imageUrl ? { image: [product.imageUrl] } : {}),
    brand: { "@type": "Brand", name: "Kingdom Fight School" },
    offers,
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\u003c") }} />;
}
