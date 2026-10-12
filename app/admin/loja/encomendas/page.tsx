import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageCircle, Paperclip } from "lucide-react";
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
  ORDER_STATUS_LABEL_PT,
  orderReference,
  supplierSummary,
  type OrderStatus,
  type RetailOrder,
} from "@/lib/retail/orders";
import { OrderBuilder } from "@/components/retail/OrderBuilder";
import { advanceOrder, cancelOrderAsAdmin, confirmOrderPayment, createOrderForCustomer, markPaidOrdersOrdered } from "./actions";

export const dynamic = "force-dynamic";

const TABS: { status: OrderStatus; label: string }[] = [
  { status: "PENDING_PAYMENT", label: "Por pagar" },
  { status: "PAID", label: "Pagas" },
  { status: "ORDERED", label: "No fornecedor" },
  { status: "READY", label: "Prontas" },
  { status: "DELIVERED", label: "Entregues" },
  { status: "CANCELLED", label: "Canceladas" },
];

const METHOD_LABEL: Record<string, string> = { CASH: "Dinheiro", TRANSFER: "Transferência / Revolut", MBWAY: "MBWay", DEPOSIT: "Depósito" };

function euro(n: number): string {
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2).replace(".", ",")} €`;
}

const btn: React.CSSProperties = { minHeight: 36, padding: "0 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-primary)", font: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", whiteSpace: "nowrap" };
const btnPrimary: React.CSSProperties = { ...btn, background: "var(--primary)", border: "1px solid var(--primary)", color: "#fff" };

type Customer = { name: string; phone: string | null; kind: string };

function OrderActions({ o, c }: { o: RetailOrder; c: Customer }) {
  const items = o.lines.map((l) => `${l.quantity}× ${l.productName} ${lineLabel(l)}`).join(", ");
  const waPay = c.phone
    ? buildWhatsAppUrl(
        c.phone,
        buildOrderPaymentMessage(c.name, {
          reference: orderReference(o.number),
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
    <form action={advanceOrder}>
      <input type="hidden" name="orderId" value={o.id} />
      <input type="hidden" name="to" value={to} />
      <button type="submit" style={primary ? btnPrimary : btn}>
        {label}
      </button>
    </form>
  );
  const cancel =
    o.status !== "DELIVERED" && o.status !== "CANCELLED" ? (
      <details>
        <summary style={{ ...btn, listStyle: "none", color: "var(--text-secondary)" }}>Cancelar</summary>
        <form action={cancelOrderAsAdmin} style={{ marginTop: 6 }}>
          <input type="hidden" name="orderId" value={o.id} />
          <button type="submit" style={{ ...btn, background: "var(--danger)", border: "1px solid var(--danger)", color: "#fff" }}>
            Confirmar cancelamento{o.saleId ? " (anula a venda)" : ""}
          </button>
        </form>
      </details>
    ) : null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-start" }}>
      {o.status === "PENDING_PAYMENT" && (
        <form action={confirmOrderPayment} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <input type="hidden" name="orderId" value={o.id} />
          <select name="paymentMethod" className="input" defaultValue="TRANSFER" aria-label="Forma de pagamento" style={{ minHeight: 36, width: "auto", fontSize: 13 }}>
            {FINANCE_PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {METHOD_LABEL[m] ?? m}
              </option>
            ))}
          </select>
          <button type="submit" style={btnPrimary}>
            Confirmar pagamento
          </button>
        </form>
      )}
      {o.status === "PENDING_PAYMENT" && waPay && (
        <a href={waPay} target="_blank" rel="noopener noreferrer" style={btn}>
          <MessageCircle size={15} aria-hidden /> Dados de pagamento
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

export default async function AdminEncomendasPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;
  const { estado } = await searchParams;
  const active = (TABS.find((t) => t.status === estado)?.status ?? "PENDING_PAYMENT") as OrderStatus;

  const [orders, preorderProducts] = await Promise.all([loadOrders(supabase, { limit: 500 }), loadPreorderProducts(supabase)]);
  const counts = new Map<OrderStatus, number>();
  for (const o of orders) counts.set(o.status, (counts.get(o.status) ?? 0) + 1);
  const shown = orders.filter((o) => o.status === active);
  const paid = orders.filter((o) => o.status === "PAID");
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

  // Comprovativos: links temporários (5 min).
  const proofUrl = new Map<string, string>();
  for (const o of shown.filter((x) => x.proofPath)) {
    const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(o.proofPath!, 300);
    if (data?.signedUrl) proofUrl.set(o.id, data.signedUrl);
  }

  return (
    <div style={{ maxWidth: "min(1000px, 100%)", display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <Link href="/admin/loja" style={{ color: "var(--text-secondary)", fontSize: 14, textDecoration: "none" }}>
          ← Loja
        </Link>
        <h1 style={{ margin: "8px 0 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 700 }}>Encomendas</h1>
        <p style={{ margin: "6px 0 0", color: "var(--text-secondary)", fontSize: 14 }}>
          Pré-encomendas da loja. Confirmas o pagamento à mão; só as pagas contam para o fornecedor.
        </p>
      </div>

      {summary.length > 0 && (
        <section className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Para encomendar ao fornecedor</h2>
            <form action={markPaidOrdersOrdered}>
              <input type="hidden" name="ids" value={paid.map((o) => o.id).join(",")} />
              <button type="submit" style={btnPrimary}>
                {paid.length === 1 ? "Marcar 1 encomenda como encomendada" : `Marcar ${paid.length} encomendas como encomendadas`}
              </button>
            </form>
          </div>
          {summary.map((g) => (
            <div key={`${g.product}|${g.color ?? ""}`}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
                {g.product}
                {g.color ? ` · ${g.color}` : ""} <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>· {g.total} {g.total === 1 ? "peça" : "peças"}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))", gap: 8 }}>
                {g.sizes.map((s) => (
                  <div key={s.size} style={{ textAlign: "center", padding: "8px 0", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg)" }}>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>{s.qty}</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{s.size}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>Só contam as encomendas com pagamento confirmado.</p>
        </section>
      )}

      <nav aria-label="Estado" className="swipe-carousel-scroll" style={{ display: "flex", gap: 8, overflowX: "auto" }}>
        {TABS.map((t) => {
          const on = t.status === active;
          return (
            <Link
              key={t.status}
              href={`/admin/loja/encomendas?estado=${t.status}`}
              aria-current={on ? "page" : undefined}
              style={{ flexShrink: 0, minHeight: 36, display: "inline-flex", alignItems: "center", padding: "0 14px", borderRadius: 999, border: `1px solid ${on ? "var(--primary)" : "var(--border)"}`, background: on ? "var(--primary)" : "var(--bg-secondary)", color: on ? "#fff" : "var(--text-primary)", fontSize: 13, fontWeight: on ? 800 : 600, textDecoration: "none" }}
            >
              {t.label} · {counts.get(t.status) ?? 0}
            </Link>
          );
        })}
      </nav>

      {shown.length === 0 ? (
        <p style={{ margin: 0, color: "var(--text-secondary)" }}>Sem encomendas neste estado.</p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {shown.map((o) => {
            const c = customerOf(o);
            return (
              <li key={o.id} className="card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800 }}>
                      {orderReference(o.number)} · {c.name}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      {c.kind}
                      {c.phone ? ` · ${c.phone}` : " · sem telefone"} · {new Date(o.createdAt).toLocaleDateString("pt-PT")}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>{euro(o.totalAmount)}</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      {ORDER_STATUS_LABEL_PT[o.status]}
                      {o.paymentMethod ? ` · ${METHOD_LABEL[o.paymentMethod] ?? o.paymentMethod}` : ""}
                    </div>
                  </div>
                </div>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4, fontSize: 14 }}>
                  {o.lines.map((l) => (
                    <li key={l.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {l.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- miniatura
                        <img src={l.imageUrl} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover", background: "#fff", flexShrink: 0 }} />
                      ) : null}
                      <span>
                      {l.quantity}× {l.productName} · <strong>{lineLabel(l)}</strong>
                      {l.recipientNote ? <span style={{ color: "var(--text-secondary)" }}> · para: {l.recipientNote}</span> : null}
                      </span>
                    </li>
                  ))}
                </ul>
                {o.notes ? <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>Nota: {o.notes}</p> : null}
                {proofUrl.has(o.id) && (
                  <a href={proofUrl.get(o.id)} target="_blank" rel="noopener noreferrer" style={{ ...btn, alignSelf: "flex-start" }}>
                    <Paperclip size={15} aria-hidden /> Ver comprovativo
                  </a>
                )}
                <OrderActions o={o} c={c} />
              </li>
            );
          })}
        </ul>
      )}

      <details className="card" style={{ padding: 16 }}>
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
    </div>
  );
}
