import type { Metadata } from "next";
import Link from "next/link";
import { Dumbbell, Package, Shirt, ShoppingBag, Tag } from "lucide-react";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { PRODUCT_CATEGORIES, PRODUCT_CATEGORY_LABELS_PT, type ProductCategory } from "@/lib/retail/constants";
import { euro, loadShopProducts, type ShopProduct } from "@/lib/retail/public-shop";
import { LojaHeader } from "@/components/loja/LojaHeader";
import { PublicSiteFooter } from "@/components/PublicSiteFooter";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Loja | Kingdom Fight School",
  description: "Equipamento, vestuário e acessórios da Kingdom Fight School. Encomenda online e levanta na escola, em Sintra.",
  alternates: { canonical: "/loja" },
};

const CATEGORY_STYLE: Record<ProductCategory, { bg: string; fg: string }> = {
  EQUIPAMENTO: { bg: "linear-gradient(135deg, #2a1215 0%, #7f1d1d 100%)", fg: "#fca5a5" },
  VESTUARIO: { bg: "linear-gradient(135deg, #0c2340 0%, #1e3a8a 100%)", fg: "#93c5fd" },
  ACESSORIO: { bg: "linear-gradient(135deg, #3a300a 0%, #854d0e 100%)", fg: "#fde68a" },
  CONSUMIVEL: { bg: "linear-gradient(135deg, #0f2a1a 0%, #166534 100%)", fg: "#86efac" },
};

function CategoryIcon({ category, size }: { category: ProductCategory; size: number }) {
  if (category === "EQUIPAMENTO") return <Dumbbell size={size} aria-hidden />;
  if (category === "VESTUARIO") return <Shirt size={size} aria-hidden />;
  if (category === "CONSUMIVEL") return <Package size={size} aria-hidden />;
  return <Tag size={size} aria-hidden />;
}

export default async function LojaPublicaPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const { cat } = await searchParams;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const admin = getAdminClientOrNull().client;
  const products: ShopProduct[] = admin ? await loadShopProducts(admin) : [];
  const withProducts = PRODUCT_CATEGORIES.filter((c) => products.some((p) => p.category === c));
  const activeCat = (PRODUCT_CATEGORIES as readonly string[]).includes(cat ?? "") ? (cat as ProductCategory) : null;
  const shown = activeCat ? products.filter((p) => p.category === activeCat) : products;

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <LojaHeader loggedIn={Boolean(auth.user)} />
      <section style={{ padding: "36px 16px", background: "linear-gradient(135deg, #2a1215 0%, var(--bg) 70%)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 1072, margin: "0 auto" }}>
          <h1 style={{ margin: 0, fontSize: "clamp(24px, 6vw, 34px)", fontWeight: 800 }}>Loja Kingdom Fight School</h1>
          <p style={{ margin: "8px 0 0", fontSize: 15, color: "var(--text-secondary)", maxWidth: 520 }}>
            Equipamento, vestuário e acessórios. Encomenda online, paga por transferência ou na secretaria e levanta na escola, em Sintra.
          </p>
        </div>
      </section>

      <div style={{ maxWidth: 1072, margin: "0 auto", padding: "18px 16px 40px", display: "flex", flexDirection: "column", gap: 18 }}>
        {products.length === 0 ? (
          <section className="card" style={{ padding: 28, display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
            <ShoppingBag size={28} aria-hidden style={{ color: "var(--primary)" }} />
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>A loja KFS vem aí</h2>
            <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>Estamos a preparar os primeiros artigos. Volta em breve.</p>
          </section>
        ) : (
          <>
            {withProducts.length > 1 && (
              <nav aria-label="Categorias" style={{ display: "flex", gap: 8, overflowX: "auto" }}>
                {[null, ...withProducts].map((c) => {
                  const on = c === activeCat;
                  return (
                    <Link
                      key={c ?? "all"}
                      href={c ? `/loja?cat=${c}` : "/loja"}
                      aria-current={on ? "page" : undefined}
                      style={{
                        flexShrink: 0,
                        height: 36,
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "0 14px",
                        borderRadius: 999,
                        border: `1px solid ${on ? "var(--text-primary)" : "var(--border)"}`,
                        background: on ? "var(--text-primary)" : "transparent",
                        color: on ? "var(--bg)" : "var(--text-primary)",
                        fontSize: 13,
                        fontWeight: 700,
                        textDecoration: "none",
                      }}
                    >
                      {c ? PRODUCT_CATEGORY_LABELS_PT[c] : "Tudo"}
                    </Link>
                  );
                })}
              </nav>
            )}
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 220px), 1fr))", gap: 14 }}>
              {shown.map((p) => (
                <li key={p.id} className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <Link href={`/loja/${p.id}`} style={{ color: "inherit", textDecoration: "none", display: "flex", flexDirection: "column", flex: 1 }}>
                    <div
                      style={{
                        height: p.imageUrl ? 200 : 130,
                        background: p.imageUrl ? "#fff" : CATEGORY_STYLE[p.category].bg,
                        color: CATEGORY_STYLE[p.category].fg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- foto do bucket público, já reduzida no envio
                        <img src={p.imageUrl} alt={p.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      ) : (
                        <CategoryIcon category={p.category} size={46} />
                      )}
                    </div>
                    <div style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <span style={{ flex: 1, fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{p.name}</span>
                        <span style={{ fontSize: 15, fontWeight: 800, color: "var(--primary)", whiteSpace: "nowrap" }}>
                          {p.minPrice === p.maxPrice ? euro(p.minPrice) : `desde ${euro(p.minPrice)}`}
                        </span>
                      </div>
                      <span style={{ marginTop: "auto", fontSize: 12, fontWeight: 700, color: p.preorder ? "var(--warning)" : p.inStock ? "var(--success)" : "var(--text-secondary)" }}>
                        {p.preorder ? "Pré-encomenda" : p.inStock ? "Disponível na secretaria" : "Esgotado de momento"}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <PublicSiteFooter />
    </main>
  );
}
