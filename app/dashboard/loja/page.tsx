import Link from "next/link";
import { Dumbbell, Package, Shirt, ShoppingBag, Store, Tag } from "lucide-react";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { requirePlan } from "@/lib/require-plan";
import { createClient } from "@/lib/supabase/server";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { PRODUCT_CATEGORIES, PRODUCT_CATEGORY_LABELS_PT, type ProductCategory } from "@/lib/retail/constants";

export const dynamic = "force-dynamic";

const CATEGORY_LABEL_EN: Record<ProductCategory, string> = {
  EQUIPAMENTO: "Equipment",
  VESTUARIO: "Apparel",
  ACESSORIO: "Accessories",
  CONSUMIVEL: "Consumables",
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

function euro(n: number): string {
  return `€${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2).replace(".", ",")}`;
}

type ShopProduct = {
  id: string;
  name: string;
  description: string | null;
  category: ProductCategory;
  minPrice: number;
  maxPrice: number;
  options: string[];
  inStock: boolean;
};

type Props = { searchParams: Promise<{ cat?: string }> };

export default async function LojaPage({ searchParams }: Props) {
  await requirePlan();
  const { cat } = await searchParams;
  const locale = (await getLocaleFromCookies()) as "pt" | "en";
  const pt = locale !== "en";
  const t = getTranslations(locale);
  const studentId = await getCurrentStudentId();
  const supabase = await createClient();
  const { data: student } = studentId
    ? await supabase.from("Student").select("schoolId").eq("id", studentId).maybeSingle()
    : { data: null };
  const schoolId = (student as { schoolId?: string | null } | null)?.schoolId ?? null;

  /**
   * Catálogo da loja da escola (o mesmo de /admin/loja). As tabelas só são legíveis pela equipa (RLS),
   * por isso lê-se com o cliente admin e mostra-se só o que é público: produtos activos, preço,
   * tamanhos/cores e se há stock na escola do aluno (sem quantidades).
   */
  let products: ShopProduct[] = [];
  const admin = getAdminClientOrNull().client;
  if (admin) {
    const { data: rows } = await admin
      .from("Product")
      .select("id, name, description, category, salePrice, schoolId")
      .eq("isActive", true)
      .order("name", { ascending: true });
    const visible = (rows ?? []).filter((r) => {
      const ps = (r as { schoolId?: string | null }).schoolId ?? null;
      return ps == null || ps === schoolId;
    }) as Array<{ id: string; name: string; description: string | null; category: ProductCategory; salePrice: number }>;
    const ids = visible.map((p) => p.id);
    const { data: variants } = ids.length
      ? await admin.from("ProductVariant").select("id, productId, size, color, priceOverride").in("productId", ids).eq("isActive", true)
      : { data: [] as { id: string; productId: string; size: string | null; color: string | null; priceOverride: number | null }[] };
    const variantIds = (variants ?? []).map((v) => v.id as string);
    const { data: balances } =
      variantIds.length && schoolId
        ? await admin.from("InventoryBalance").select("variantId, quantityOnHand").in("variantId", variantIds).eq("schoolId", schoolId)
        : { data: [] as { variantId: string; quantityOnHand: number }[] };
    const qtyByVariant = new Map((balances ?? []).map((b) => [b.variantId as string, Number(b.quantityOnHand)]));

    products = visible.map((p) => {
      const vs = (variants ?? []).filter((v) => v.productId === p.id);
      const prices = vs.length ? vs.map((v) => Number(v.priceOverride ?? p.salePrice)) : [Number(p.salePrice)];
      const options = [...new Set(vs.map((v) => [v.size, v.color].filter(Boolean).join(" / ")).filter(Boolean))];
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        category: (PRODUCT_CATEGORIES as readonly string[]).includes(p.category) ? p.category : "ACESSORIO",
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices),
        options,
        inStock: vs.some((v) => (qtyByVariant.get(v.id as string) ?? 0) > 0),
      };
    });
  }

  const categoriesWithProducts = PRODUCT_CATEGORIES.filter((c) => products.some((p) => p.category === c));
  const activeCat = (PRODUCT_CATEGORIES as readonly string[]).includes(cat ?? "") ? (cat as ProductCategory) : null;
  const shown = activeCat ? products.filter((p) => p.category === activeCat) : products;
  const catLabel = (c: ProductCategory) => (pt ? PRODUCT_CATEGORY_LABELS_PT[c] : CATEGORY_LABEL_EN[c]);

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: 18, paddingBottom: 24 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: "clamp(22px, 5vw, 28px)", fontWeight: 800, color: "var(--text-primary)" }}>{pt ? "Loja" : "Store"}</h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>{t("storeDescription")}</p>
      </header>

      {/* Como comprar */}
      <div className="card" style={{ padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
        <span aria-hidden style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 12, backgroundColor: "var(--primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Store size={22} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 15, fontWeight: 800 }}>{pt ? "Compra na secretaria" : "Buy at the front desk"}</span>
          <span style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
            {pt ? "Escolhe aqui, levanta e paga na escola (dinheiro, cartão ou Multibanco)." : "Pick here, collect and pay at the school (cash, card or Multibanco)."}
          </span>
        </span>
      </div>

      {products.length === 0 ? (
        /* Ainda sem produtos no catálogo */
        <section className="card" style={{ padding: "clamp(20px, 5vw, 28px)", display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start" }}>
          <span aria-hidden style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: "var(--bg)", border: "1px solid var(--border)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShoppingBag size={28} />
          </span>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{pt ? "A loja KFS vem aí" : "The KFS store is coming"}</h2>
            <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>{t("storeComingSoon")}</p>
          </div>
          <div style={{ width: "100%", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 150px), 1fr))", gap: 10 }}>
            {(["EQUIPAMENTO", "VESTUARIO", "ACESSORIO"] as const).map((c) => (
              <div key={c} style={{ height: 96, borderRadius: 14, background: CATEGORY_STYLE[c].bg, color: CATEGORY_STYLE[c].fg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <CategoryIcon category={c} size={28} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{catLabel(c)}</span>
              </div>
            ))}
          </div>
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>
            {t("storeMeanwhile")}{" "}
            <Link href="/dashboard/biblioteca" style={{ color: "var(--primary)", fontWeight: 600 }}>
              {t("libraryTitle")}
            </Link>
          </p>
        </section>
      ) : (
        <>
          {categoriesWithProducts.length > 1 && (
            <nav aria-label={pt ? "Categorias" : "Categories"} className="swipe-carousel-scroll" style={{ display: "flex", gap: 8, overflowX: "auto" }}>
              {[null, ...categoriesWithProducts].map((c) => {
                const on = c === activeCat;
                return (
                  <Link
                    key={c ?? "all"}
                    href={c ? `/dashboard/loja?cat=${c}` : "/dashboard/loja"}
                    aria-current={on ? "page" : undefined}
                    style={{
                      flexShrink: 0,
                      height: 36,
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "0 14px",
                      borderRadius: 999,
                      border: `1px solid ${on ? "var(--text-primary)" : "var(--border)"}`,
                      backgroundColor: on ? "var(--text-primary)" : "transparent",
                      color: on ? "var(--bg)" : "var(--text-primary)",
                      fontSize: 13,
                      fontWeight: 700,
                      textDecoration: "none",
                    }}
                  >
                    {c ? catLabel(c) : pt ? "Tudo" : "All"}
                  </Link>
                );
              })}
            </nav>
          )}

          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 220px), 1fr))", gap: 14 }}>
            {shown.map((p) => (
              <li key={p.id} className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div style={{ position: "relative", height: 130, background: CATEGORY_STYLE[p.category].bg, color: CATEGORY_STYLE[p.category].fg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <CategoryIcon category={p.category} size={46} />
                  <span
                    style={{
                      position: "absolute",
                      left: 10,
                      top: 10,
                      padding: "3px 9px",
                      borderRadius: 999,
                      background: "rgba(0,0,0,0.55)",
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {catLabel(p.category)}
                  </span>
                </div>
                <div style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <span style={{ flex: 1, fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{p.name}</span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: "var(--primary)", whiteSpace: "nowrap" }}>
                      {p.minPrice === p.maxPrice ? euro(p.minPrice) : `${pt ? "desde" : "from"} ${euro(p.minPrice)}`}
                    </span>
                  </div>
                  {p.description ? (
                    <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {p.description}
                    </p>
                  ) : null}
                  {p.options.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {p.options.slice(0, 6).map((o) => (
                        <span key={o} style={{ padding: "2px 8px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 11, color: "var(--text-secondary)" }}>
                          {o}
                        </span>
                      ))}
                      {p.options.length > 6 ? <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>+{p.options.length - 6}</span> : null}
                    </div>
                  )}
                  <span style={{ marginTop: "auto", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: p.inStock ? "var(--success)" : "var(--text-secondary)" }}>
                    <span style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: p.inStock ? "var(--success)" : "var(--border)" }} />
                    {p.inStock ? (pt ? "Disponível na secretaria" : "Available at the front desk") : pt ? "Esgotado de momento" : "Out of stock"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
