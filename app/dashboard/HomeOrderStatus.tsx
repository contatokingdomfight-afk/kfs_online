import Link from "next/link";
import { ChevronRight, ShoppingBag } from "lucide-react";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { loadOrders, orderReference, type OrderStatus } from "@/lib/retail/orders";

const STATUS_HINT: Partial<Record<OrderStatus, string>> = {
  PENDING_PAYMENT: "À espera do pagamento",
  PAID: "Pagamento confirmado",
  ORDERED: "Encomendada ao fornecedor",
  READY: "Pronta a levantar na secretaria",
};

function euro(n: number): string {
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2).replace(".", ",")} €`;
}

/** Home do aluno: atalho para as encomendas da loja ainda em curso (não entregues nem canceladas). */
export async function HomeOrderStatus({ studentId }: { studentId: string }) {
  const admin = getAdminClientOrNull().client;
  if (!admin) return null;
  const orders = await loadOrders(admin, {
    studentId,
    statuses: ["PENDING_PAYMENT", "PAID", "ORDERED", "READY"],
    limit: 3,
  });
  if (orders.length === 0) return null;

  return (
    <section aria-label="As minhas encomendas" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {orders.map((o) => {
        const ready = o.status === "READY";
        const pay = o.status === "PENDING_PAYMENT";
        const first = o.lines[0];
        const more = o.lines.length - 1;
        return (
          <Link
            key={o.id}
            href={`/dashboard/loja/encomendas/${o.id}`}
            className="card"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 14px",
              textDecoration: "none",
              color: "var(--text-primary)",
              border: ready ? "2px solid var(--success)" : pay ? "2px solid var(--warning)" : "1px solid var(--border)",
            }}
          >
            <ShoppingBag size={22} aria-hidden style={{ flexShrink: 0, color: ready ? "var(--success)" : "var(--primary)" }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ display: "block", fontSize: 14 }}>
                {STATUS_HINT[o.status] ?? o.status}
              </strong>
              <span style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {orderReference(o.number)} · {first ? first.productName : "Encomenda"}
                {more > 0 ? ` +${more}` : ""} · {euro(o.totalAmount)}
              </span>
            </span>
            <ChevronRight size={18} aria-hidden style={{ color: "var(--text-secondary)" }} />
          </Link>
        );
      })}
    </section>
  );
}
