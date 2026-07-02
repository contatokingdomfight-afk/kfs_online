import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { listRetailSales, getRetailSaleDetail } from "@/lib/retail/sales";
import { PAYMENT_METHOD_LABELS_PT } from "@/lib/retail/constants";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ ok?: string; id?: string }>;

function formatMoney(n: number) {
  return n.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

export default async function AdminLojaVendasPage({ searchParams }: { searchParams: SearchParams }) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const sales = await listRetailSales(supabase, { limit: 100 });
  const detail = params.id ? await getRetailSaleDetail(supabase, params.id) : null;

  return (
    <div style={{ maxWidth: "min(900px, 100%)" }}>
      <Link href="/admin/loja" style={{ color: "var(--text-secondary)", fontSize: 14, textDecoration: "none" }}>
        ← Loja
      </Link>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", margin: "8px 0 20px" }}>
        <h1 style={{ margin: 0, fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, flex: 1 }}>Vendas</h1>
        <Link href="/admin/loja/vendas/novo" className="btn btn-primary" style={{ textDecoration: "none" }}>
          Nova venda
        </Link>
      </div>

      {params.ok && (
        <p role="status" className="card" style={{ padding: 12, marginBottom: 16, borderLeft: "4px solid var(--success)" }}>
          Venda registada com sucesso.
        </p>
      )}

      {detail && (
        <section className="card" style={{ padding: 16, marginBottom: 20 }}>
          <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600 }}>Detalhe da venda</h2>
          <p style={{ margin: "0 0 8px", fontSize: 14 }}>
            {new Date(detail.soldAt).toLocaleString("pt-PT")} · {detail.schoolName} ·{" "}
            {PAYMENT_METHOD_LABELS_PT[detail.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS_PT] ?? detail.paymentMethod}
          </p>
          {detail.studentName && <p style={{ margin: "0 0 8px", fontSize: 14 }}>Aluno: {detail.studentName}</p>}
          <ul style={{ margin: "12px 0", paddingLeft: 18, fontSize: 14 }}>
            {detail.lines.map((l) => (
              <li key={l.id}>
                {l.productName} ({l.variantLabel}) × {l.quantity} — {formatMoney(l.lineTotal)}
              </li>
            ))}
          </ul>
          <p style={{ margin: 0, fontWeight: 700 }}>Total: {formatMoney(detail.totalAmount)}</p>
        </section>
      )}

      <section className="card" style={{ padding: 16 }}>
        {sales.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", margin: 0 }}>Sem vendas registadas.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--card-border)" }}>
                  <th style={{ padding: 8 }}>Data</th>
                  <th style={{ padding: 8 }}>Total</th>
                  <th style={{ padding: 8 }}>Pagamento</th>
                  <th style={{ padding: 8 }}></th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} style={{ borderTop: "1px solid var(--card-border)" }}>
                    <td style={{ padding: 8, whiteSpace: "nowrap" }}>{new Date(s.soldAt).toLocaleString("pt-PT")}</td>
                    <td style={{ padding: 8 }}>{formatMoney(s.totalAmount)}</td>
                    <td style={{ padding: 8 }}>
                      {PAYMENT_METHOD_LABELS_PT[s.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS_PT] ?? s.paymentMethod}
                    </td>
                    <td style={{ padding: 8 }}>
                      <Link href={`/admin/loja/vendas?id=${s.id}`} style={{ fontSize: 13 }}>
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
