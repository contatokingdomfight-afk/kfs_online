import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { loadPreorderProducts } from "@/lib/retail/orders";
import { loadActivePromotions } from "@/lib/retail/discounts.server";
import { euro, isProfileComplete, loadShopProducts, loadShopProfile } from "@/lib/retail/public-shop";
import { OrderBuilder } from "@/components/retail/OrderBuilder";
import { LojaHeader } from "@/components/loja/LojaHeader";
import { PublicSiteFooter } from "@/components/PublicSiteFooter";
import { checkCoupon } from "@/app/dashboard/loja/actions";
import { createShopOrder } from "../actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ productId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { productId } = await params;
  const admin = getAdminClientOrNull().client;
  const [p] = admin ? await loadShopProducts(admin, { productId }) : [];
  return p
    ? { title: `${p.name} | Loja Kingdom`, description: p.description ?? undefined, alternates: { canonical: `/loja/${productId}` } }
    : { title: "Loja | Kingdom Fight School" };
}

const note: React.CSSProperties = { margin: 0, padding: "10px 12px", borderRadius: 10, fontSize: 13, lineHeight: 1.45 };
const ctaStyle: React.CSSProperties = { minHeight: 46, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, textDecoration: "none" };

export default async function LojaProdutoPage({ params }: Props) {
  const { productId } = await params;
  const admin = getAdminClientOrNull().client;
  if (!admin) notFound();
  const [product] = await loadShopProducts(admin, { productId });
  if (!product) notFound();

  const user = await getCurrentDbUser();
  const profile = user ? await loadShopProfile(admin, user.id) : null;
  const ready = Boolean(user) && isProfileComplete(profile);
  const here = `/loja/${productId}`;
  const preorderProducts = product.preorder && ready ? (await loadPreorderProducts(admin)).filter((p) => p.variants.length > 0) : [];
  const promotions = product.preorder && ready ? await loadActivePromotions(admin) : [];

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <LojaHeader loggedIn={Boolean(user)} crumb={product.name} />
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "20px 16px 40px", display: "flex", flexDirection: "column", gap: 16 }}>
        <header>
          <h1 style={{ margin: 0, fontSize: "clamp(22px, 5vw, 28px)", fontWeight: 800 }}>{product.name}</h1>
          <p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 800, color: "var(--primary)" }}>
            {product.minPrice === product.maxPrice ? euro(product.minPrice) : `${euro(product.minPrice)} – ${euro(product.maxPrice)}`}
          </p>
          {product.description ? <p style={{ margin: "8px 0 0", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.55 }}>{product.description}</p> : null}
        </header>

        {!product.preorder ? (
          <p style={{ ...note, border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
            {product.inStock ? "Disponível na secretaria: passa pela escola para o levantar." : "Esgotado de momento."}
          </p>
        ) : !user ? (
          <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
              Entra ou cria conta para encomendar. Voltas automaticamente a este artigo. Pagas por transferência ou na secretaria e levantas na escola.
            </p>
            <Link href={`/sign-in?next=${encodeURIComponent(here)}`} className="btn btn-primary" style={ctaStyle}>
              Entrar para encomendar
            </Link>
            <Link href={`/sign-up?next=${encodeURIComponent(here)}`} style={{ textAlign: "center", fontSize: 14, color: "var(--primary)", fontWeight: 600 }}>
              Ainda não tenho conta
            </Link>
          </div>
        ) : !ready ? (
          <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>Antes de encomendares, precisamos do teu contacto e morada (1 minuto, só uma vez).</p>
            <Link href={`/loja/cadastro?next=${encodeURIComponent(here)}`} className="btn btn-primary" style={ctaStyle}>
              Completar cadastro
            </Link>
          </div>
        ) : (
          <OrderBuilder
            storageKey="kfs-loja-carrinho"
            products={preorderProducts}
            initialProductId={product.id}
            action={createShopOrder}
            submitLabel="Enviar encomenda"
            promotions={promotions}
            checkCoupon={checkCoupon}
            footerNote={
              <p style={{ ...note, background: "rgba(250,204,21,0.14)", border: "1px solid var(--warning)" }}>
                Pagas por transferência (IBAN ou Revolut) ou na secretaria para confirmar. Só depois a encomenda segue para o fornecedor.
              </p>
            }
          />
        )}
      </div>
      <PublicSiteFooter />
    </main>
  );
}
