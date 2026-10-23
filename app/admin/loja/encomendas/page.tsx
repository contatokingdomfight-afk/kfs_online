import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock, MessageCircle, Paperclip, Search } from "lucide-react";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { FINANCE_PAYMENT_METHODS } from "@/lib/finance-payment-method";
import { SCHOOL_PAYMENT_DETAILS } from "@/lib/enrollment-form";
import { buildOrderPaymentMessage, buildOrderReadyMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import {
  lineLabel,
  loadOrders,
  loadPreorderProducts,
  orderReference,
  supplierSummary,
  type OrderStatus,
  type RetailOrder,
} from "@/lib/retail/orders";
import { OrderBuilder } from "@/components/retail/OrderBuilder";
import { checkCoupon } from "@/app/dashboard/loja/actions";
import { loadActivePromotions } from "@/lib/retail/discounts.server";
import { advanceOrder, cancelOrderAsAdmin, confirmOrderPayment, createOrderForCustomer, markPaidOrdersOrdered } from "./actions";

export const dynamic = "force-dynamic";

const BASE = "/admin/loja/encomendas";

/** Passos ativos (funil) e histórico. */
const STAGES: { status: OrderStatus; label: string; short: string }[] = [
  { status: "PENDING_PAYMENT", label: "Por pagar", short: "Por pagar" },
  { status: "PAID", label: "Pagas · a encomendar", short: "Pagas" },
  { status: "ORDERED", label: "No fornecedor", short: "No fornecedor" },
  { status: "READY", label: "Prontas a levantar", short: "Prontas" },
];
const HISTORY: { status: OrderStatus; label: string }[] = [
  { status: "DELIVERED", label: "Entregues" },
  { status: "CANCELLED", label: "Canceladas" },
];

const FILTERS = [
  { key: "", label: "Todas" },
  { key: "online", label: "Online" },
  { key: "manual", label: "À mão" },
  { key: "proof", label: "Com comprovativo" },
] as const;

const METHOD_LABEL: Record<string, string> = { CASH: "Dinheiro", TRANSFER: "Transferência", MBWAY: "MBWay", DEPOSIT: "Depósito" };
const WAITING_WARN_DAYS = 3;

function euro(n: number): string {
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2).replace(".", ",")} €`;
}

function when(iso: string): string {
  const d = new Date(iso);
  const today = new Date().toLocaleDateString("pt-PT", { timeZone: "Europe/Lisbon" });
  const day = d.toLocaleDateString("pt-PT", { timeZone: "Europe/Lisbon" });
  const time = d.toLocaleTimeString("pt-PT", { timeZone: "Europe/Lisbon", hour: "2-digit", minute: "2-digit" });
  return day === today ? `hoje, ${time}` : `${d.toLocaleDateString("pt-PT", { timeZone: "Europe/Lisbon", day: "numeric", month: "short" })}, ${time}`;
}

/** Paga pela Revolut (webhook): tem data de pagamento mas ninguém a confirmou à mão. */
function paidOnline(o: RetailOrder): boolean {
  return o.paidAt != null && o.paidConfirmedByUserId == null && o.status !== "PENDING_PAYMENT" && o.status !== "CANCELLED";
}

function waitingDays(o: RetailOrder): number {
  return Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 86_400_000);
}

const btn: React.CSSProperties = { minHeight: 36, padding: "0 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-primary)", font: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, textDecoration: "none", whiteSpace: "nowrap" };
const btnPrimary: React.CSSProperties = { ...btn, background: "var(--primary)", border: "1px solid var(--primary)", color: "#fff" };
const btnGhost: React.CSSProperties = { ...btn, background: "transparent", color: "var(--text-secondary)" };

const chipBase: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 800, padding: "3px 9px", borderRadius: 999, border: "1px solid var(--border)", color: "var(--text-secondary)" };
const chipOk: React.CSSProperties = { ...chipBase, color: "var(--success)", borderColor: "color-mix(in srgb, var(--success) 40%, transparent)", background: "color-mix(in srgb, var(--success) 9%, transparent)" };
const chipWarn: React.CSSProperties = { ...chipBase, color: "var(--warning)", borderColor: "color-mix(in srgb, var(--warning) 40%, transparent)", background: "color-mix(in srgb, var(--warning) 9%, transparent)" };
const chipInfo: React.CSSProperties = { ...chipBase, color: "#60a5fa", borderColor: "rgba(96,165,250,.4)", background: "rgba(96,165,250,.09)" };

type Customer = { name: string; phone: string | null; kind: string };

function OrderChips({ o, proofHref }: { o: RetailOrder; proofHref?: string }) {
  const chips: React.ReactNode[] = [];
  if (paidOnline(o)) {
    chips.push(
      <span key="on" style={chipOk}>
        <CheckCircle2 size={13} aria-hidden /> Pago online · Revolut
      </span>
    );
  } else if (o.paidAt && o.status !== "CANCELLED") {
    chips.push(
      <span key="man" style={chipInfo}>
        Confirmado à mão{o.paymentMethod ? ` · ${METHOD_LABEL[o.paymentMethod] ?? o.paymentMethod}` : ""}
      </span>
    );
  }
  if (o.status === "PENDING_PAYMENT" && o.proofPath) {
    chips.push(
      <span key="proof" style={chipInfo}>
        <Paperclip size={13} aria-hidden /> Comprovativo enviado
      </span>
    );
  }
  if (o.status === "PENDING_PAYMENT" && waitingDays(o) >= WAITING_WARN_DAYS) {
    chips.push(
      <span key="wait" style={chipWarn}>
        <Clock size={13} aria-hidden /> À espera há {waitingDays(o)} dias
      </span>
    );
  }
  if (proofHref) {
    chips.push(
      <a key="see" href={proofHref} target="_blank" rel="noopener noreferrer" style={{ ...chipBase, color: "var(--text-primary)", textDecoration: "none" }}>
        Ver comprovativo
      </a>
    );
  }
  return chips.length ? <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{chips}</div> : null;
}

function OrderActions({ o, c }: { o: RetailOrder; c: Customer }) {
  const items = o.lines.map((l) => `${l.quantity}× ${l.productName} ${lineLabel(l)}`).join(", ");
  const waPay = c.phone
    ? buildWhatsAppUrl(
        c.phone,
        buildOrderPaymentMessage(c.name, {
          reference: orderReference(o.number),
          descriptor: [...new Set(o.lines.map((l) => l.productName))].join(", "),
          total: euro(o.totalAmount),
          items,
          iban: SCHOOL_PAYMENT_DETAILS.iban,
          recipient: SCHOOL_PAYMENT_DETAILS.recipientName,
          revolut: SCHOOL_PAYMENT_DETAILS.revolutTag,
        })
      )
    : null;
  const waReady = c.phone ? buildWhatsAppUrl(c.phone, buildOrderReadyMessage(c.name, orderReference(o.number))) : null;
  const advance = (to: OrderStatus, label: string, primary = false) => (
    <form action={advanceOrder} className="enc-grow">
      <input type="hidden" name="orderId" value={o.id} />
      <input type="hidden" name="to" value={to} />
      <button type="submit" style={{ ...(primary ? btnPrimary : btn), width: "100%" }}>
        {label}
      </button>
    </form>
  );
  const cancel =
    o.status !== "DELIVERED" && o.status !== "CANCELLED" ? (
      <details>
        <summary style={{ ...btnGhost, listStyle: "none" }}>Cancelar</summary>
        <form action={cancelOrderAsAdmin} style={{ marginTop: 6 }}>
          <input type="hidden" name="orderId" value={o.id} />
          <button type="submit" style={{ ...btn, background: "var(--danger)", border: "1px solid var(--danger)", color: "#fff" }}>
            Confirmar cancelamento{o.saleId ? " (anula a venda)" : ""}
          </button>
        </form>
      </details>
    ) : null;

  return (
    <div className="enc-acts" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-start", justifyContent: "flex-end" }}>
      {o.status === "PENDING_PAYMENT" && (
        <form action={confirmOrderPayment} className="enc-grow" style={{ display: "flex", gap: 6 }}>
          <input type="hidden" name="orderId" value={o.id} />
          <select name="paymentMethod" className="input" defaultValue="TRANSFER" aria-label="Forma de pagamento" style={{ minHeight: 36, width: "auto", fontSize: 13 }}>
            {FINANCE_PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {METHOD_LABEL[m] ?? m}
              </option>
            ))}
          </select>
          <button type="submit" style={{ ...(o.proofPath ? btnPrimary : btn), flex: 1 }}>
            Confirmar pagamento
          </button>
        </form>
      )}
      {o.status === "PENDING_PAYMENT" && waPay && (
        <a href={waPay} target="_blank" rel="noopener noreferrer" style={btn}>
          <MessageCircle size={15} aria-hidden /> {o.proofPath ? "WhatsApp" : "Lembrar"}
        </a>
      )}
      {o.status === "PAID" && advance("READY", "Chegou · marcar pronta")}
      {o.status === "ORDERED" && advance("READY", "Chegou · marcar pronta", true)}
      {o.status === "READY" && advance("DELIVERED", "Entregue", true)}
      {o.status === "READY" && waReady && (
        <a href={waReady} target="_blank" rel="noopener noreferrer" style={btn}>
          <MessageCircle size={15} aria-hidden /> Avisar
        </a>
      )}
      {cancel}
    </div>
  );
}

export default async function AdminEncomendasPage({ searchParams }: { searchParams: Promise<{ estado?: string; q?: string; f?: string; nova?: string }> }) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;
  const { estado, q, f, nova } = await searchParams;
  const active = ([...STAGES, ...HISTORY].find((t) => t.status === estado)?.status ?? "PENDING_PAYMENT") as OrderStatus;
  const query = (q ?? "").trim().toLowerCase();
  const filter = FILTERS.some((x) => x.key === f) ? (f as string) : "";

  const [orders, preorderProducts, promotions] = await Promise.all([loadOrders(supabase, { limit: 500 }), loadPreorderProducts(supabase), loadActivePromotions(supabase)]);
  const byStatus = (s: OrderStatus) => orders.filter((o) => o.status === s);
  const sum = (list: RetailOrder[]) => list.reduce((t, o) => t + o.totalAmount, 0);
  const paid = byStatus("PAID");
  const summary = supplierSummary(paid);

  // Quem encomendou: aluno (nome da conta + telefone do perfil) ou cliente sem conta.
  const studentIds = [...new Set(orders.map((o) => o.studentId).filter(Boolean))] as string[];
  const customer = new Map<string, Customer>();
  if (studentIds.length) {
    const [{ data: st }, { data: prof }] = await Promise.all([
      supabase.from("Student").select("id, userId").in("id", studentIds),
      supabase.from("StudentProfile").select("studentId, phone").in("studentId", studentIds),
    ]);
    const userIds = ((st ?? []) as { id: string; userId: string }[]).map((s) => s.userId);
    const { data: users } = userIds.length ? await supabase.from("User").select("id, name, email").in("id", userIds) : { data: [] };
    const userName = new Map(((users ?? []) as { id: string; name: string | null; email: string | null }[]).map((u) => [u.id, u.name?.trim() || u.email || "Aluno"]));
    const phone = new Map(((prof ?? []) as { studentId: string; phone: string | null }[]).map((p) => [p.studentId, p.phone]));
    for (const s of (st ?? []) as { id: string; userId: string }[]) customer.set(s.id, { name: userName.get(s.userId) ?? "Aluno", phone: phone.get(s.id) ?? null, kind: "aluno · app" });
  }
  const customerOf = (o: RetailOrder): Customer =>
    o.studentId ? customer.get(o.studentId) ?? { name: "Aluno", phone: null, kind: "aluno · app" } : { name: o.customerName ?? "—", phone: o.customerPhone, kind: "sem conta" };

  let shown = byStatus(active).filter((o) => {
    if (query) {
      const c = customerOf(o);
      const hay = `${orderReference(o.number)} ${c.name} ${c.phone ?? ""}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    if (filter === "online") return paidOnline(o);
    if (filter === "manual") return o.paidAt != null && !paidOnline(o);
    if (filter === "proof") return o.proofPath != null;
    return true;
  });
  // Por pagar: com comprovativo primeiro (é o que dá para confirmar já), depois as mais antigas.
  if (active === "PENDING_PAYMENT") {
    shown = [...shown].sort((a, b) => Number(b.proofPath != null) - Number(a.proofPath != null) || a.createdAt.localeCompare(b.createdAt));
  }

  // Comprovativos: links temporários (5 min).
  const proofUrl = new Map<string, string>();
  for (const o of shown.filter((x) => x.proofPath && x.status === "PENDING_PAYMENT")) {
    const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(o.proofPath!, 300);
    if (data?.signedUrl) proofUrl.set(o.id, data.signedUrl);
  }

  const href = (p: { estado?: string; q?: string; f?: string }) => {
    const sp = new URLSearchParams();
    const e = p.estado ?? active;
    if (e !== "PENDING_PAYMENT") sp.set("estado", e);
    const qq = p.q ?? q ?? "";
    if (qq) sp.set("q", qq);
    const ff = p.f ?? filter;
    if (ff) sp.set("f", ff);
    const s = sp.toString();
    return s ? `${BASE}?${s}` : BASE;
  };

  const stageInfo = (s: OrderStatus): { hint: string; flag: string | null } => {
    const list = byStatus(s);
    if (s === "PENDING_PAYMENT") {
      const proofs = list.filter((o) => o.proofPath).length;
      return { hint: `${euro(sum(list))}${proofs ? ` · ${proofs} com comprovativo` : ""}`, flag: proofs ? `${proofs} a confirmar` : null };
    }
    if (s === "PAID") {
      const online = list.filter(paidOnline).length;
      return { hint: `${euro(sum(list))}${online ? ` · ${online} online` : ""}`, flag: list.length ? "encomendar" : null };
    }
    if (s === "ORDERED") return { hint: list.length ? "à espera de chegar" : "—", flag: null };
    return { hint: list.length ? `${euro(sum(list))} · avisar aluno` : "—", flag: list.length ? "entregar" : null };
  };

  const activeLabel = [...STAGES, ...HISTORY].find((t) => t.status === active)?.label ?? "";
  const filtersFor = active === "PENDING_PAYMENT" ? FILTERS.filter((x) => x.key === "" || x.key === "proof") : active === "CANCELLED" ? [] : FILTERS.filter((x) => x.key !== "proof");

  return (
    <div style={{ maxWidth: "min(1000px, 100%)", display: "flex", flexDirection: "column", gap: 16, paddingBottom: 72 }}>
      <style>{`
        .enc-pipe{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
        .enc-order{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px}
        .enc-right{display:flex;flex-direction:column;align-items:flex-end;justify-content:space-between;gap:10px;min-width:220px}
        .enc-fab{display:none}
        @media (max-width:640px){
          .enc-pipe{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
          .enc-order{grid-template-columns:1fr}
          .enc-right{align-items:stretch;min-width:0}
          .enc-acts{justify-content:stretch!important}
          .enc-grow{flex:1}
          .enc-head-new{display:none!important}
          .enc-fab{display:block;position:sticky;bottom:12px;z-index:5}
          .enc-stage-long{display:none}
        }
        @media (min-width:641px){.enc-stage-short{display:none}}
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <div>
          <Link href="/admin/loja" style={{ color: "var(--text-secondary)", fontSize: 14, textDecoration: "none" }}>
            ← Loja
          </Link>
          <h1 style={{ margin: "8px 0 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 800 }}>Encomendas</h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: 13 }}>Pré-encomendas da loja · os pagamentos online confirmam-se sozinhos</p>
        </div>
        <a href={`${BASE}?nova=1#nova`} className="enc-head-new" style={btnPrimary}>
          + Nova encomenda
        </a>
      </div>

      <nav aria-label="Passos das encomendas" className="enc-pipe">
        {STAGES.map((s) => {
          const on = s.status === active;
          const info = stageInfo(s.status);
          return (
            <Link
              key={s.status}
              href={href({ estado: s.status, f: "" })}
              aria-current={on ? "page" : undefined}
              style={{ position: "relative", display: "block", padding: "12px 14px", borderRadius: 14, border: `1px solid ${on ? "var(--primary)" : "var(--border)"}`, boxShadow: on ? "0 0 0 1px var(--primary) inset" : undefined, background: on ? "color-mix(in srgb, var(--primary) 10%, var(--bg-secondary))" : "var(--bg-secondary)", color: "var(--text-primary)", textDecoration: "none" }}
            >
              <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.1 }}>{byStatus(s.status).length}</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>
                <span className="enc-stage-long">{s.label}</span>
                <span className="enc-stage-short">{s.short}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{info.hint}</div>
              {info.flag ? (
                <span style={{ position: "absolute", top: 10, right: 10, fontSize: 10.5, fontWeight: 800, padding: "3px 8px", borderRadius: 999, background: "color-mix(in srgb, var(--warning) 14%, transparent)", color: "var(--warning)" }}>{info.flag}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div style={{ display: "flex", gap: 14, fontSize: 13, color: "var(--text-secondary)", flexWrap: "wrap" }}>
        Histórico:
        {HISTORY.map((h) => (
          <Link key={h.status} href={href({ estado: h.status, f: "" })} aria-current={h.status === active ? "page" : undefined} style={{ color: h.status === active ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: h.status === active ? 800 : 500, textUnderlineOffset: 3 }}>
            {h.label} · {byStatus(h.status).length}
          </Link>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <form action={BASE} method="get" style={{ flex: 1, minWidth: 200, display: "flex" }}>
          {active !== "PENDING_PAYMENT" && <input type="hidden" name="estado" value={active} />}
          {filter && <input type="hidden" name="f" value={filter} />}
          <label style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, minHeight: 40, padding: "0 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
            <Search size={16} aria-hidden style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
            <input name="q" type="search" defaultValue={q ?? ""} placeholder="Procurar por nome ou KFS-ENC-…" aria-label="Procurar encomendas" style={{ flex: 1, minWidth: 0, background: "transparent", border: 0, outline: "none", color: "var(--text-primary)", font: "inherit", fontSize: 14 }} />
          </label>
        </form>
        {filtersFor.length > 1 &&
          filtersFor.map((x) => {
            const on = x.key === filter;
            return (
              <Link key={x.key || "all"} href={href({ f: x.key })} aria-current={on ? "true" : undefined} style={{ flexShrink: 0, fontSize: 12.5, fontWeight: 700, padding: "8px 12px", borderRadius: 999, border: `1px solid ${on ? "var(--text-primary)" : "var(--border)"}`, background: on ? "var(--text-primary)" : "transparent", color: on ? "var(--bg)" : "var(--text-secondary)", textDecoration: "none" }}>
                {x.label}
              </Link>
            );
          })}
      </div>

      {active === "PAID" && summary.length > 0 && (
        <section className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>
              Para encomendar ao fornecedor · {summary.reduce((t, g) => t + g.total, 0)} peças
            </h2>
            <form action={markPaidOrdersOrdered}>
              <input type="hidden" name="ids" value={paid.map((o) => o.id).join(",")} />
              <button type="submit" style={btnPrimary}>
                {paid.length === 1 ? "Já encomendei esta" : `Já encomendei estas ${paid.length}`}
              </button>
            </form>
          </div>
          {summary.map((g) => (
            <div key={`${g.product}|${g.color ?? ""}`}>
              <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 8 }}>
                {g.product}
                {g.color ? ` · ${g.color}` : ""} <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>· {g.total} {g.total === 1 ? "peça" : "peças"}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(60px, 1fr))", gap: 8 }}>
                {g.sizes.map((s) => (
                  <div key={s.size} style={{ textAlign: "center", padding: "6px 0", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg)" }}>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{s.qty}</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>{s.size}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {shown.length === 0 ? (
        <p className="card" style={{ margin: 0, padding: 16, color: "var(--text-secondary)", fontSize: 14 }}>
          {query || filter ? "Nenhuma encomenda corresponde à pesquisa." : `Sem encomendas em «${activeLabel}».`}
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {shown.map((o) => {
            const c = customerOf(o);
            return (
              <li key={o.id} className="card enc-order" style={{ padding: 14 }}>
                <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 700, letterSpacing: 0.3 }}>
                      {orderReference(o.number)} · {when(o.createdAt)}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, marginTop: 2 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                      {c.kind} · {c.phone ?? "sem telefone"}
                    </div>
                  </div>
                  <OrderChips o={o} proofHref={proofUrl.get(o.id)} />
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6, fontSize: 13.5 }}>
                    {o.lines.map((l) => (
                      <li key={l.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {l.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- miniatura
                          <img src={l.imageUrl} alt="" style={{ width: 34, height: 34, borderRadius: 8, objectFit: "cover", background: "#fff", flexShrink: 0 }} />
                        ) : null}
                        <span>
                          {l.quantity}× {l.productName} · <strong>{lineLabel(l)}</strong>
                          {l.recipientNote ? <span style={{ color: "var(--text-secondary)" }}> · para: {l.recipientNote}</span> : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {o.discountAmount > 0 ? (
                    <p style={{ margin: 0, fontSize: 13, color: "var(--success)", fontWeight: 700 }}>
                      −{euro(o.discountAmount)} · {o.discountLabel}
                      {o.subtotalAmount != null ? <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}> (subtotal {euro(o.subtotalAmount)})</span> : null}
                    </p>
                  ) : null}
                  {o.notes ? <p style={{ margin: 0, fontSize: 12.5, color: "var(--text-secondary)" }}>Nota: {o.notes}</p> : null}
                </div>
                <div className="enc-right">
                  <div style={{ fontSize: 20, fontWeight: 800 }}>{euro(o.totalAmount)}</div>
                  <OrderActions o={o} c={c} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <details id="nova" className="card" style={{ padding: 16 }} open={nova === "1"}>
        <summary style={{ cursor: "pointer", fontSize: 15, fontWeight: 700 }}>+ Nova encomenda (sem conta)</summary>
        <p style={{ margin: "8px 0 14px", fontSize: 13, color: "var(--text-secondary)" }}>Para amigos e familiares sem conta na app. Depois envia-lhes os dados de pagamento por WhatsApp.</p>
        {preorderProducts.length === 0 ? (
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>
            Nenhum produto em pré-encomenda. Ativa «Pré-encomenda» num produto em{" "}
            <Link href="/admin/loja/produtos" style={{ color: "var(--primary)" }}>
              Produtos
            </Link>
            .
          </p>
        ) : (
          <OrderBuilder
            products={preorderProducts}
            action={createOrderForCustomer}
            submitLabel="Registar encomenda"
            promotions={promotions}
            checkCoupon={checkCoupon}
            extraFields={
              <div className="card" style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 12 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)" }}>Nome</span>
                  <input name="customerName" className="input" required placeholder="Nome de quem encomenda" />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)" }}>Telefone</span>
                  <input name="customerPhone" className="input" required inputMode="tel" placeholder="+351 912 345 678" />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: "1 / -1" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)" }}>
                    Nota <span style={{ fontWeight: 400 }}>(opcional)</span>
                  </span>
                  <input name="notes" className="input" placeholder="Ex.: amigo do Pedro, entrega na aula de sábado" />
                </label>
              </div>
            }
          />
        )}
      </details>

      <div className="enc-fab">
        <a href={`${BASE}?nova=1#nova`} style={{ ...btnPrimary, width: "100%", minHeight: 46, boxShadow: "0 8px 24px rgba(0,0,0,.45)" }}>
          + Nova encomenda
        </a>
      </div>
    </div>
  );
}
