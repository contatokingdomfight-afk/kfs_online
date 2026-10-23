import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { currentReferenceMonthLisbon } from "@/lib/lisbon-payment-dates";
import { listLowStock } from "@/lib/retail/inventory";
import { sumRetailSalesForMonth } from "@/lib/retail/sales";
import { loadActivePromotions } from "@/lib/retail/discounts.server";
import { loadSalesOverview, monthLabel, previousMonth, type SaleOrigin } from "@/lib/retail/sales-overview";
import { euro, SaleRow } from "@/components/retail/SaleRow";

export const dynamic = "force-dynamic";

const ORIGIN_COLORS: Record<SaleOrigin, string> = { COUNTER: "#a1a1aa", ORDER_MANUAL: "#60a5fa", ORDER_ONLINE: "var(--success)" };
const ORIGIN_NAMES: Record<SaleOrigin, string> = { COUNTER: "Balcão", ORDER_MANUAL: "Encomendas pagas à mão", ORDER_ONLINE: "Online · Revolut" };

export default async function AdminLojaPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const month = currentReferenceMonthLisbon(new Date());
  const [lowStock, sales, prevTotal, { data: openOrders }, { data: products }, promotions] = await Promise.all([
    listLowStock(supabase),
    loadSalesOverview(supabase, month),
    sumRetailSalesForMonth(supabase, previousMonth(month)),
    supabase.from("RetailOrder").select("status, totalAmount").in("status", ["PENDING_PAYMENT", "PAID", "READY"]),
    supabase.from("Product").select("allowPreorder").eq("isActive", true),
    loadActivePromotions(supabase),
  ]);

  const total = sales.reduce((t, s) => t + s.totalAmount, 0);
  const diff = total - prevTotal;
  const orders = (openOrders ?? []) as { status: string; totalAmount: number | string }[];
  const pending = orders.filter((o) => o.status === "PENDING_PAYMENT");
  const pendingSum = pending.reduce((t, o) => t + Number(o.totalAmount), 0);
  const toOrder = orders.filter((o) => o.status === "PAID").length;
  const ready = orders.filter((o) => o.status === "READY").length;
  const productList = (products ?? []) as { allowPreorder: boolean }[];
  const byOrigin = (["COUNTER", "ORDER_MANUAL", "ORDER_ONLINE"] as SaleOrigin[]).map((o) => {
    const list = sales.filter((s) => s.origin === o);
    return { origin: o, count: list.length, sum: list.reduce((t, s) => t + s.totalAmount, 0) };
  });

  const card: React.CSSProperties = { padding: 14 };
  const kpiValue: React.CSSProperties = { fontSize: 24, fontWeight: 800, lineHeight: 1.1 };
  const kpiLabel: React.CSSProperties = { fontSize: 12.5, color: "var(--text-secondary)", marginTop: 4 };

  const tiles: { href: string; icon: string; title: string; text: string; flag?: string | null; external?: boolean }[] = [
    {
      href: "/admin/loja/encomendas",
      icon: "📦",
      title: "Encomendas",
      text: [pending.length ? `${pending.length} por pagar` : null, toOrder ? `${toOrder} a encomendar` : null, ready ? `${ready} pronta${ready === 1 ? "" : "s"}` : null].filter(Boolean).join(" · ") || "Nada pendente",
      flag: pending.length || toOrder || ready ? "tratar" : null,
    },
    { href: "/admin/loja/vendas", icon: "🧾", title: "Vendas", text: `${sales.length} este mês · histórico e filtros` },
    { href: "/admin/loja/produtos", icon: "👕", title: "Produtos", text: `${productList.length} ativos · ${productList.filter((p) => p.allowPreorder).length} em pré-encomenda` },
    { href: "/admin/loja/stock", icon: "📊", title: "Stock", text: lowStock.length ? `${lowStock.length} com stock baixo` : "Sem alertas", flag: lowStock.length ? "baixo" : null },
    { href: "/admin/loja/promocoes", icon: "🏷️", title: "Promoções e cupões", text: promotions.length ? `${promotions.length} promoç${promotions.length === 1 ? "ão ativa" : "ões ativas"}` : "Descontos e cupões" },
    { href: "/loja", icon: "🌐", title: "Loja online", text: "Ver /loja como cliente ↗", external: true },
  ];

  return (
    <div style={{ maxWidth: "min(900px, 100%)", display: "flex", flexDirection: "column", gap: 16, paddingBottom: 72 }}>
      <style>{`
        .loja-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
        .loja-tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
        .loja-fab{display:none}
        @media (max-width:640px){
          .loja-kpis,.loja-tiles{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
          .loja-head-new{display:none!important}
          .loja-fab{display:block;position:sticky;bottom:12px;z-index:5}
        }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <div>
          <Link href="/admin" style={{ color: "var(--text-secondary)", fontSize: 14, textDecoration: "none" }}>
            ← Admin
          </Link>
          <h1 style={{ margin: "8px 0 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 800 }}>Loja</h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: 13, textTransform: "none" }}>
            Balcão, encomendas e loja online · <span style={{ textTransform: "capitalize" }}>{monthLabel(month)}</span>
          </p>
        </div>
        <Link href="/admin/loja/vendas/novo" className="btn btn-primary loja-head-new" style={{ textDecoration: "none" }}>
          + Registar venda (balcão)
        </Link>
      </div>

      <div className="loja-kpis">
        <div className="card" style={card}>
          <div style={kpiValue}>{euro(total)}</div>
          <div style={kpiLabel}>Vendas do mês</div>
          {prevTotal || total ? (
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2, color: diff >= 0 ? "var(--success)" : "var(--danger)" }}>
              {diff >= 0 ? "▲ +" : "▼ −"}
              {euro(Math.abs(Math.round(diff * 100) / 100))} vs mês anterior
            </div>
          ) : null}
        </div>
        <div className="card" style={card}>
          <div style={kpiValue}>{sales.length}</div>
          <div style={kpiLabel}>Vendas{sales.length ? ` · ticket médio ${euro(Math.round((total / sales.length) * 100) / 100)}` : ""}</div>
        </div>
        <Link href="/admin/loja/encomendas" className="card" style={{ ...card, textDecoration: "none", color: "var(--text-primary)" }}>
          <div style={kpiValue}>{pending.length}</div>
          <div style={kpiLabel}>Encomendas por pagar</div>
          {pendingSum ? <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2, color: "var(--warning)" }}>{euro(pendingSum)} em aberto</div> : null}
        </Link>
        <Link href="/admin/loja/stock" className="card" style={{ ...card, textDecoration: "none", color: "var(--text-primary)" }}>
          <div style={{ ...kpiValue, color: lowStock.length ? "var(--danger)" : undefined }}>{lowStock.length}</div>
          <div style={kpiLabel}>Alertas de stock baixo</div>
        </Link>
      </div>

      {total > 0 && (
        <section className="card" style={{ padding: 14 }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 800 }}>De onde vieram as vendas</h2>
          <div style={{ display: "flex", height: 8, borderRadius: 999, overflow: "hidden", background: "var(--bg)" }} aria-hidden>
            {byOrigin.filter((o) => o.sum > 0).map((o) => (
              <span key={o.origin} style={{ width: `${(o.sum / total) * 100}%`, background: ORIGIN_COLORS[o.origin] }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 8, fontSize: 12.5, color: "var(--text-secondary)" }}>
            {byOrigin.map((o) => (
              <span key={o.origin}>
                <i style={{ display: "inline-block", width: 9, height: 9, borderRadius: 3, marginRight: 6, verticalAlign: "middle", background: ORIGIN_COLORS[o.origin] }} />
                {ORIGIN_NAMES[o.origin]} · {euro(o.sum)} ({o.count})
              </span>
            ))}
          </div>
        </section>
      )}

      <nav aria-label="Secções da loja" className="loja-tiles">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} target={t.external ? "_blank" : undefined} className="card" style={{ position: "relative", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 4, textDecoration: "none", color: "var(--text-primary)" }}>
            <span aria-hidden style={{ fontSize: 18 }}>
              {t.icon}
            </span>
            <strong style={{ fontSize: 14 }}>{t.title}</strong>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t.text}</span>
            {t.flag ? (
              <span style={{ position: "absolute", top: 10, right: 10, fontSize: 10.5, fontWeight: 800, padding: "3px 8px", borderRadius: 999, background: "color-mix(in srgb, var(--warning) 14%, transparent)", color: "var(--warning)" }}>{t.flag}</span>
            ) : null}
          </Link>
        ))}
      </nav>

      {lowStock.length > 0 && (
        <section className="card" style={{ padding: 14 }}>
          <h2 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 800 }}>Stock baixo</h2>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
            {lowStock.slice(0, 8).map((item) => (
              <li key={`${item.id}-${item.schoolId}`} style={{ fontSize: 14 }}>
                <strong>{item.productName}</strong> ({item.schoolName}) — {item.quantityOnHand} em stock
                {item.reorderLevel > 0 ? ` (mín. ${item.reorderLevel})` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Últimas vendas</h2>
          <Link href="/admin/loja/vendas" style={{ color: "var(--primary)", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
            Ver todas →
          </Link>
        </div>
        {sales.length === 0 ? (
          <p className="card" style={{ margin: 0, padding: 14, color: "var(--text-secondary)" }}>
            Nenhuma venda este mês.
          </p>
        ) : (
          sales.slice(0, 5).map((s) => <SaleRow key={s.id} s={s} compact />)
        )}
      </section>

      <div className="loja-fab">
        <Link href="/admin/loja/vendas/novo" className="btn btn-primary" style={{ width: "100%", minHeight: 46, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(0,0,0,.45)" }}>
          + Registar venda
        </Link>
      </div>
    </div>
  );
}
