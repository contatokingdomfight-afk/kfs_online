import Link from "next/link";
import { paymentMethodLabelPt } from "@/lib/finance-payment-method";
import type { SaleOverview } from "@/lib/retail/sales-overview";

export function euro(n: number): string {
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2).replace(".", ",")} €`;
}

const chip: React.CSSProperties = { display: "inline-flex", alignItems: "center", fontSize: 11, fontWeight: 800, padding: "3px 9px", borderRadius: 999, border: "1px solid var(--border)", color: "var(--text-secondary)", whiteSpace: "nowrap", textDecoration: "none" };
const chipOk: React.CSSProperties = { ...chip, color: "var(--success)", borderColor: "color-mix(in srgb, var(--success) 40%, transparent)", background: "color-mix(in srgb, var(--success) 9%, transparent)" };
const chipInfo: React.CSSProperties = { ...chip, color: "#60a5fa", borderColor: "rgba(96,165,250,.4)", background: "rgba(96,165,250,.09)" };

export function SaleChips({ s }: { s: SaleOverview }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {s.orderRef ? <span style={chipInfo}>Encomenda {s.orderRef}</span> : <span style={chip}>Balcão</span>}
      {s.origin === "ORDER_ONLINE" ? <span style={chipOk}>Online · Revolut</span> : <span style={chip}>{s.origin === "ORDER_MANUAL" ? `Confirmado à mão · ${paymentMethodLabelPt(s.paymentMethod)}` : paymentMethodLabelPt(s.paymentMethod)}</span>}
    </div>
  );
}

function time(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-PT", { timeZone: "Europe/Lisbon", hour: "2-digit", minute: "2-digit" });
}

function itemsSummary(s: SaleOverview): string {
  if (!s.lines.length) return "—";
  const [first, ...rest] = s.lines;
  return `${first.quantity}× ${first.productName} · ${first.label}${rest.length ? ` + ${rest.length} artigo${rest.length === 1 ? "" : "s"}` : ""}`;
}

/** Linha de venda: hora, cliente, artigos e etiquetas; o detalhe abre na própria linha. */
export function SaleRow({ s, open = false, compact = false }: { s: SaleOverview; open?: boolean; compact?: boolean }) {
  const thumb = s.lines.find((l) => l.imageUrl)?.imageUrl ?? null;
  const when = new Date(s.soldAt);
  return (
    <details open={open} className="card sale-row" style={{ padding: 0, overflow: "hidden" }}>
      <summary style={{ listStyle: "none", cursor: "pointer", padding: "12px 14px", display: "grid", gridTemplateColumns: compact ? "minmax(0,1fr) auto" : "48px minmax(0,1fr) auto", gap: 12, alignItems: "center" }}>
        {!compact && <span className="sale-time" style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 700 }}>{time(s.soldAt)}</span>}
        <span style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 14.5, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.customerName ?? (s.origin === "COUNTER" ? "Venda ao balcão" : "Cliente")}</span>
          {!compact && (
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)", minWidth: 0 }}>
              {thumb ? (
                // eslint-disable-next-line @next/next/no-img-element -- miniatura
                <img src={thumb} alt="" style={{ width: 26, height: 26, borderRadius: 7, objectFit: "cover", background: "#fff", flexShrink: 0 }} />
              ) : null}
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{itemsSummary(s)}</span>
            </span>
          )}
          <SaleChips s={s} />
        </span>
        <span style={{ textAlign: "right" }}>
          <strong style={{ display: "block", fontSize: 17 }}>{euro(s.totalAmount)}</strong>
          <span style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>{compact ? when.toLocaleDateString("pt-PT", { timeZone: "Europe/Lisbon", day: "numeric", month: "short" }) : "detalhe ▾"}</span>
        </span>
      </summary>
      <div style={{ borderTop: "1px solid var(--border)", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
          {[
            ["Data", when.toLocaleString("pt-PT", { timeZone: "Europe/Lisbon", dateStyle: "short", timeStyle: "short" })],
            ["Escola", s.schoolName ?? "—"],
            ["Registada por", s.origin === "ORDER_ONLINE" ? "Pagamento online (automático)" : s.registeredByName ?? "—"],
          ].map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 }}>{k}</div>
              {v}
            </div>
          ))}
        </div>
        <div>
          {s.lines.map((l, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0", borderBottom: "1px dashed var(--border)" }}>
              <span>
                {l.productName} ({l.label}) × {l.quantity}
              </span>
              <strong>{euro(l.lineTotal)}</strong>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontWeight: 800 }}>
            <span>Total</span>
            <span>{euro(s.totalAmount)}</span>
          </div>
        </div>
        {s.notes ? <p style={{ margin: 0, color: "var(--text-secondary)" }}>Nota: {s.notes}</p> : null}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {s.orderRef ? (
            <Link href={`/admin/loja/encomendas?q=${encodeURIComponent(s.orderRef)}&estado=${s.orderStatus ?? "PAID"}`} style={{ ...chip, fontSize: 12.5, padding: "7px 12px", color: "var(--text-primary)" }}>
              Abrir encomenda {s.orderRef}
            </Link>
          ) : null}
          {s.studentId ? (
            <Link href={`/admin/alunos/${s.studentId}`} style={{ ...chip, fontSize: 12.5, padding: "7px 12px", color: "var(--text-primary)" }}>
              Abrir ficha do aluno
            </Link>
          ) : null}
        </div>
      </div>
    </details>
  );
}
