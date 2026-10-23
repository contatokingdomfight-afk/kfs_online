import Link from "next/link";
import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { currentReferenceMonthLisbon } from "@/lib/lisbon-payment-dates";
import { loadSalesOverview, monthLabel, nextMonth, previousMonth, type SaleOrigin, type SaleOverview } from "@/lib/retail/sales-overview";
import { euro, SaleRow } from "@/components/retail/SaleRow";

export const dynamic = "force-dynamic";

const BASE = "/admin/loja/vendas";

type SearchParams = Promise<{ ok?: string; id?: string; mes?: string; q?: string; origem?: string }>;

const FILTERS: { key: string; label: string; match: (s: SaleOverview) => boolean }[] = [
  { key: "", label: "Todas", match: () => true },
  { key: "balcao", label: "Balcão", match: (s) => s.origin === "COUNTER" },
  { key: "encomendas", label: "Encomendas", match: (s) => s.origin !== "COUNTER" },
  { key: "online", label: "Online", match: (s) => s.origin === ("ORDER_ONLINE" satisfies SaleOrigin) },
];

function dayKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Europe/Lisbon" });
}

function dayLabel(key: string): string {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Lisbon" });
  const d = new Date(`${key}T12:00:00Z`);
  const label = d.toLocaleDateString("pt-PT", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  return key === today ? `Hoje · ${label}` : label;
}

export default async function AdminLojaVendasPage({ searchParams }: { searchParams: SearchParams }) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const thisMonth = currentReferenceMonthLisbon(new Date());
  let month = params.mes && /^\d{4}-\d{2}$/.test(params.mes) ? params.mes : thisMonth;
  // Link direto para uma venda (?id=): abre no mês dessa venda.
  if (params.id && !params.mes) {
    const { data: sale } = await supabase.from("RetailSale").select("soldAt").eq("id", params.id).maybeSingle();
    if (sale) month = currentReferenceMonthLisbon(new Date((sale as { soldAt: string }).soldAt));
  }
  const filter = FILTERS.find((f) => f.key === params.origem) ?? FILTERS[0];
  const query = (params.q ?? "").trim().toLowerCase();

  const all = await loadSalesOverview(supabase, month);
  const searched = query
    ? all.filter((s) => `${s.customerName ?? ""} ${s.orderRef ?? ""} ${s.lines.map((l) => `${l.productName} ${l.label}`).join(" ")}`.toLowerCase().includes(query))
    : all;
  const shown = searched.filter(filter.match);
  const total = shown.reduce((t, s) => t + s.totalAmount, 0);

  const days = new Map<string, SaleOverview[]>();
  for (const s of shown) {
    const k = dayKey(s.soldAt);
    days.set(k, [...(days.get(k) ?? []), s]);
  }

  const href = (p: { mes?: string; origem?: string; q?: string }) => {
    const sp = new URLSearchParams();
    const m = p.mes ?? month;
    if (m !== thisMonth) sp.set("mes", m);
    const o = p.origem ?? filter.key;
    if (o) sp.set("origem", o);
    const q = p.q ?? params.q ?? "";
    if (q) sp.set("q", q);
    const s = sp.toString();
    return s ? `${BASE}?${s}` : BASE;
  };

  const monthBtn: React.CSSProperties = { minWidth: 40, minHeight: 40, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", textDecoration: "none", fontWeight: 800 };

  return (
    <div style={{ maxWidth: "min(900px, 100%)", display: "flex", flexDirection: "column", gap: 14, paddingBottom: 72 }}>
      <style>{`
        .vendas-fab{display:none}
        @media (max-width:640px){
          .vendas-head-new{display:none!important}
          .vendas-fab{display:block;position:sticky;bottom:12px;z-index:5}
          .sale-row summary{grid-template-columns:minmax(0,1fr) auto!important}
          .sale-row .sale-time{display:none}
        }
      `}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <div>
          <Link href="/admin/loja" style={{ color: "var(--text-secondary)", fontSize: 14, textDecoration: "none" }}>
            ← Loja
          </Link>
          <h1 style={{ margin: "8px 0 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 800 }}>Vendas</h1>
        </div>
        <Link href="/admin/loja/vendas/novo" className="btn btn-primary vendas-head-new" style={{ textDecoration: "none" }}>
          + Nova venda
        </Link>
      </div>

      {params.ok && (
        <p role="status" className="card" style={{ padding: 12, margin: 0, borderLeft: "4px solid var(--success)" }}>
          Venda registada com sucesso.
        </p>
      )}

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <Link href={href({ mes: previousMonth(month) })} aria-label="Mês anterior" style={monthBtn}>
            ◀
          </Link>
          <span style={{ minHeight: 40, display: "inline-flex", alignItems: "center", padding: "0 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-secondary)", fontSize: 13.5, fontWeight: 700, textTransform: "capitalize" }}>
            {monthLabel(month)}
          </span>
          {month < thisMonth ? (
            <Link href={href({ mes: nextMonth(month) })} aria-label="Mês seguinte" style={monthBtn}>
              ▶
            </Link>
          ) : null}
        </div>
        <form action={BASE} method="get" style={{ flex: 1, minWidth: 200, display: "flex" }}>
          {month !== thisMonth && <input type="hidden" name="mes" value={month} />}
          {filter.key && <input type="hidden" name="origem" value={filter.key} />}
          <label style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, minHeight: 40, padding: "0 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
            <Search size={16} aria-hidden style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
            <input name="q" type="search" defaultValue={params.q ?? ""} placeholder="Procurar cliente, artigo ou KFS-ENC-…" aria-label="Procurar vendas" style={{ flex: 1, minWidth: 0, background: "transparent", border: 0, outline: "none", color: "var(--text-primary)", font: "inherit", fontSize: 14 }} />
          </label>
        </form>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {FILTERS.map((f) => {
          const on = f.key === filter.key;
          return (
            <Link key={f.key || "all"} href={href({ origem: f.key })} aria-current={on ? "true" : undefined} style={{ fontSize: 12.5, fontWeight: 700, padding: "8px 12px", borderRadius: 999, border: `1px solid ${on ? "var(--text-primary)" : "var(--border)"}`, background: on ? "var(--text-primary)" : "transparent", color: on ? "var(--bg)" : "var(--text-secondary)", textDecoration: "none", whiteSpace: "nowrap" }}>
              {f.label} · {searched.filter(f.match).length}
            </Link>
          );
        })}
        <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--text-secondary)" }}>
          <strong style={{ color: "var(--text-primary)" }}>{euro(total)}</strong> · {shown.length} venda{shown.length === 1 ? "" : "s"}
          {shown.length ? ` · ticket médio ${euro(Math.round((total / shown.length) * 100) / 100)}` : ""}
        </span>
      </div>

      {shown.length === 0 ? (
        <p className="card" style={{ margin: 0, padding: 16, color: "var(--text-secondary)" }}>
          {query || filter.key ? "Nenhuma venda corresponde à pesquisa." : `Sem vendas em ${monthLabel(month)}.`}
        </p>
      ) : (
        [...days.entries()].map(([k, list]) => (
          <section key={k} style={{ display: "flex", flexDirection: "column", gap: 8 }} aria-label={dayLabel(k)}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-secondary)", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4 }}>
              <span>{dayLabel(k)}</span>
              <span>{euro(list.reduce((t, s) => t + s.totalAmount, 0))}</span>
            </div>
            {list.map((s) => (
              <SaleRow key={s.id} s={s} open={params.id === s.id} />
            ))}
          </section>
        ))
      )}

      <div className="vendas-fab">
        <Link href="/admin/loja/vendas/novo" className="btn btn-primary" style={{ width: "100%", minHeight: 46, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(0,0,0,.45)" }}>
          + Nova venda
        </Link>
      </div>
    </div>
  );
}
