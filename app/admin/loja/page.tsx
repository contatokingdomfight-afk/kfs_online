import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { currentReferenceMonthLisbon } from "@/lib/lisbon-payment-dates";
import { listLowStock } from "@/lib/retail/inventory";
import { listRetailSales } from "@/lib/retail/sales";
import { PAYMENT_METHOD_LABELS_PT } from "@/lib/retail/constants";

export const dynamic = "force-dynamic";

function formatMoney(n: number) {
  return n.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

export default async function AdminLojaPage() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const month = currentReferenceMonthLisbon(new Date());
  const [lowStock, sales] = await Promise.all([
    listLowStock(supabase),
    listRetailSales(supabase, { month, limit: 10 }),
  ]);

  const salesTotal = sales.reduce((s, r) => s + r.totalAmount, 0);

  return (
    <div style={{ maxWidth: "min(900px, 100%)" }}>
      <div style={{ marginBottom: 20 }}>
        <Link href="/admin" style={{ color: "var(--text-secondary)", fontSize: 14, textDecoration: "none" }}>
          ← Admin
        </Link>
        <h1 style={{ margin: "8px 0 0", fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600 }}>Loja presencial</h1>
        <p style={{ margin: "8px 0 0", color: "var(--text-secondary)", fontSize: 14 }}>
          Catálogo, stock por escola e registo de vendas na secretaria.
        </p>
      </div>

      <nav
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 10,
          marginBottom: 24,
        }}
      >
        <Link href="/admin/loja/vendas/novo" className="btn btn-primary" style={{ textDecoration: "none", textAlign: "center", gridColumn: "1 / -1" }}>
          Registar venda (POS)
        </Link>
        <Link href="/admin/loja/produtos" className="btn btn-secondary" style={{ textDecoration: "none", textAlign: "center" }}>
          Produtos
        </Link>
        <Link href="/admin/loja/stock" className="btn btn-secondary" style={{ textDecoration: "none", textAlign: "center" }}>
          Stock
        </Link>
        <Link href="/admin/loja/vendas" className="btn btn-secondary" style={{ textDecoration: "none", textAlign: "center", gridColumn: "1 / -1" }}>
          Histórico de vendas
        </Link>
      </nav>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Vendas do mês</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{formatMoney(salesTotal)}</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Alertas stock baixo</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: lowStock.length ? "var(--danger)" : undefined }}>
            {lowStock.length}
          </div>
        </div>
      </div>

      {lowStock.length > 0 && (
        <section className="card" style={{ padding: 16, marginBottom: 20 }}>
          <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600 }}>Stock baixo</h2>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
            {lowStock.slice(0, 8).map((item) => (
              <li key={`${item.id}-${item.schoolId}`} style={{ fontSize: 14 }}>
                <strong>{item.productName}</strong> ({item.schoolName}) — {item.quantityOnHand} em stock
                {item.reorderLevel > 0 ? ` (mín. ${item.reorderLevel})` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card" style={{ padding: 16 }}>
        <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600 }}>Últimas vendas</h2>
        {sales.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", margin: 0 }}>Nenhuma venda este mês.</p>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
            {sales.map((s) => (
              <li key={s.id}>
                <Link href={`/admin/loja/vendas?id=${s.id}`} style={{ fontSize: 14, color: "var(--text-primary)" }}>
                  {new Date(s.soldAt).toLocaleString("pt-PT")} — {formatMoney(s.totalAmount)} (
                  {PAYMENT_METHOD_LABELS_PT[s.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS_PT] ?? s.paymentMethod})
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
