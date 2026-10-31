import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bell, CheckCircle2, Circle, Clock, Landmark, Store } from "lucide-react";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { hasAnySchoolPaymentMethod, loadSchoolPaymentInfo, orderPaymentSchoolId } from "@/lib/school-payment-methods";
import { CopyTextButton } from "@/components/ui/CopyTextButton";
import { lineLabel, loadOrders, ORDER_FLOW, ORDER_STATUS_LABEL_PT, orderReference, type OrderStatus } from "@/lib/retail/orders";
import { cancelMyOrder } from "@/app/dashboard/loja/actions";
import { ProofUploadForm } from "@/app/dashboard/loja/encomendas/[id]/ProofUploadForm";
import { ClearSavedCart } from "@/components/retail/ClearSavedCart";
import { PayOnlineButton } from "@/components/retail/PayOnlineButton";

function euro(n: number): string {
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2).replace(".", ",")} €`;
}

const STEP_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Encomenda enviada",
  PAID: "Pagamento confirmado",
  ORDERED: "Encomendada ao fornecedor",
  READY: "Pronta a levantar na secretaria",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelada",
};

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: "var(--bg)", border: "1px solid var(--border)" }}>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 11, color: "var(--text-secondary)" }}>{label}</span>
        <span style={{ display: "block", fontSize: 14, fontWeight: 700, wordBreak: "break-all" }}>{value}</span>
      </span>
      <CopyTextButton text={value} />
    </div>
  );
}

/** Detalhe da encomenda do próprio (aluno ou cliente da loja pública). `basePath` define para onde volta o link «Loja». */
export async function OrderDetailView({ id, nova, pago, basePath }: { id: string; nova?: string; pago?: string; basePath: "/dashboard/loja" | "/loja" }) {
  const admin = getAdminClientOrNull().client;
  const [studentId, dbUser] = await Promise.all([getCurrentStudentId(), getCurrentDbUser()]);
  if (!admin || (!studentId && !dbUser)) notFound();
  const [order] = await loadOrders(admin, { ids: [id] });
  if (!order) notFound();
  const { data: owner } = await admin.from("RetailOrder").select("createdByUserId").eq("id", id).maybeSingle();
  const mine = (studentId != null && order.studentId === studentId) || (dbUser != null && (owner as { createdByUserId: string | null } | null)?.createdByUserId === dbUser.id);
  if (!mine) notFound();
  const payment = await loadSchoolPaymentInfo(orderPaymentSchoolId(order.schoolId));
  const { transfer, mbwayPhone } = payment;
  const canPayOnline = mine && dbUser != null && payment.onlineRevolut;

  const ref = orderReference(order.number);
  const cancelled = order.status === "CANCELLED";
  // Passo em curso: enviada já está feita; «Entregue» fecha tudo.
  const nowIdx = order.status === "DELIVERED" ? ORDER_FLOW.length : ORDER_FLOW.indexOf(order.status) + 1;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: 16, paddingBottom: 24 }}>
      <Link href={basePath} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-secondary)", fontSize: 14, textDecoration: "none" }}>
        <ArrowLeft size={16} aria-hidden />
        Loja
      </Link>

      {nova === "1" && <ClearSavedCart />}
      {nova === "1" && (
        <div role="status" style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(74,222,128,0.12)", border: "1px solid var(--success)", fontSize: 14, fontWeight: 700 }}>
          Encomenda enviada! Falta só o pagamento para a confirmarmos.
        </div>
      )}

      <header>
        <h1 style={{ margin: 0, fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 800 }}>Encomenda {ref}</h1>
        <p style={{ margin: "2px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>
          {ORDER_STATUS_LABEL_PT[order.status]} · {euro(order.totalAmount)}
        </p>
      </header>

      <section className="card" aria-label="Estado da encomenda" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {cancelled ? (
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>Esta encomenda foi cancelada.</p>
        ) : (
          ORDER_FLOW.map((s, i) => {
            const done = i < nowIdx;
            const now = i === nowIdx;
            return (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: done || now ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: now ? 800 : 500 }}>
                {done ? (
                  <CheckCircle2 size={20} color="var(--success)" aria-hidden />
                ) : now ? (
                  <Clock size={20} color="var(--warning)" aria-hidden />
                ) : (
                  <Circle size={20} aria-hidden />
                )}
                {s === "PAID" && now ? "À espera do pagamento" : STEP_LABEL[s]}
              </div>
            );
          })
        )}
        {!cancelled && order.status !== "DELIVERED" && (
          <p style={{ margin: "4px 0 0", display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "var(--text-secondary)" }}>
            <Bell size={15} aria-hidden />
            Avisamos-te no sino quando estiver pronta a levantar.
          </p>
        )}
      </section>

      <section className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        {order.lines.map((l) => (
          <div key={l.id} style={{ display: "flex", gap: 10, fontSize: 14, alignItems: "center" }}>
            {l.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- miniatura
              <img src={l.imageUrl} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", background: "#fff", flexShrink: 0 }} />
            ) : null}
            <span style={{ flex: 1, minWidth: 0 }}>
              <strong>
                {l.quantity > 1 ? `${l.quantity}× ` : ""}
                {l.productName}
              </strong>{" "}
              · {lineLabel(l)}
              <span style={{ display: "block", fontSize: 12, color: "var(--text-secondary)" }}>{l.recipientNote ? `para: ${l.recipientNote}` : "para mim"}</span>
            </span>
            <strong>{euro(l.lineTotal)}</strong>
          </div>
        ))}
        {order.discountAmount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 14, color: "var(--success)", fontWeight: 700, borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 4 }}>
            <span>{order.discountLabel}</span>
            <span>−{euro(order.discountAmount)}</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 800, borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 4 }}>
          <span>Total</span>
          <span>{euro(order.totalAmount)}</span>
        </div>
      </section>

      {order.status === "PENDING_PAYMENT" && (
        <section className="card" aria-labelledby="pay-title" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, border: "2px solid var(--primary)" }}>
          <h2 id="pay-title" style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Como pagar</h2>
          {pago === "1" && (
            <p role="status" style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>
              Se acabaste de pagar online, a confirmação chega em instantes. Atualiza a página daqui a pouco.
            </p>
          )}
          {!hasAnySchoolPaymentMethod(payment) && (
            <p role="alert" style={{ margin: 0, fontSize: 14, color: "var(--danger)", lineHeight: 1.45 }}>
              A escola ainda não indicou como receber pagamentos. Fala com a escola para pagares esta encomenda.
            </p>
          )}
          {canPayOnline && (
            <>
              <PayOnlineButton orderId={order.id} />
              <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", textAlign: "center" }}>ou paga por transferência / na secretaria:</p>
            </>
          )}
          {transfer && (
            <>
              <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14, fontWeight: 700 }}>
                <Landmark size={18} aria-hidden style={{ color: "var(--primary)" }} />
                {transfer.iban && transfer.revolutTag ? "Transferência ou Revolut" : transfer.iban ? "Transferência" : "Revolut"}
              </div>
              {transfer.iban && <CopyRow label="IBAN" value={transfer.iban} />}
              {transfer.holder && <CopyRow label="Titular" value={transfer.holder} />}
              {transfer.bicSwift && <CopyRow label="BIC / SWIFT" value={transfer.bicSwift} />}
              {transfer.revolutTag && <CopyRow label="Revolut" value={transfer.revolutTag} />}
            </>
          )}
          {mbwayPhone && <CopyRow label="MB Way" value={mbwayPhone} />}
          {(transfer || mbwayPhone) && (
            <>
              <CopyRow label="Valor" value={order.totalAmount.toFixed(2).replace(".", ",")} />
              <CopyRow label="Descritivo / referência (importante)" value={ref} />
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.45 }}>
                Põe a referência <strong style={{ color: "var(--text-primary)" }}>{ref}</strong> no descritivo para sabermos a que encomenda pertence.
              </p>
            </>
          )}
          {payment.cash && (
            <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14, fontWeight: 700, marginTop: 4 }}>
              <Store size={18} aria-hidden style={{ color: "var(--primary)" }} />
              {payment.isSede ? "Ou paga na secretaria (dinheiro ou MBWay)" : "Ou paga na secretaria (dinheiro)"}
            </div>
          )}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
            <ProofUploadForm orderId={order.id} current={order.proofFileName} />
          </div>
        </section>
      )}

      {order.status === "PENDING_PAYMENT" && (
        <form action={cancelMyOrder}>
          <input type="hidden" name="orderId" value={order.id} />
          <button type="submit" className="btn" style={{ width: "100%", minHeight: 44, color: "var(--danger)", border: "1px solid var(--border)", background: "transparent" }}>
            Cancelar encomenda
          </button>
        </form>
      )}
    </div>
  );
}
