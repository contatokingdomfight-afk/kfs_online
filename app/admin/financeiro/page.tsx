import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { currentReferenceMonthLisbon } from "@/lib/lisbon-payment-dates";
import { getFinanceiroOverview } from "@/lib/admin-finance-overview";
import { MonthSelector } from "./_components/MonthSelector";
import { PorReceberList } from "./_components/PorReceberList";
import { loadPorReceberItems } from "@/lib/finance/por-receber";
import { FindStudentToPay } from "./_components/FindStudentToPay";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ month?: string }>;

const eur = (n: number) => n.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });


/** Receber: o que falta cobrar (mensalidades do mês, atrasos, seguros e matrículas) com registo num toque. */
export default async function AdminFinanceiroReceberPage({ searchParams }: { searchParams: SearchParams }) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const currentMonth = currentReferenceMonthLisbon(new Date());
  const referenceMonth = params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : currentMonth;

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const overview = await getFinanceiroOverview(supabase, referenceMonth);

  const items = await loadPorReceberItems(supabase, referenceMonth);

  const toReceive = items.reduce((a, i) => a + i.amount, 0);
  const periodRaw = new Date(referenceMonth + "-15T12:00:00Z").toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
  const periodLabel = periodRaw.charAt(0).toUpperCase() + periodRaw.slice(1);

  const kpi = (label: string, value: string, color?: string) => (
    <div className="card" style={{ padding: 14, background: "var(--bg)" }}>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: "clamp(20px, 4vw, 24px)", fontWeight: 700, color: color ?? "var(--text-primary)" }}>{value}</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 12px" }}>
        <h2 style={{ margin: 0, fontSize: "clamp(17px, 4.2vw, 19px)", fontWeight: 600 }}>{periodLabel}</h2>
        <Suspense fallback={null}>
          <MonthSelector currentMonth={referenceMonth} label="Mês" />
        </Suspense>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
        {kpi("Recebido no mês", eur(overview.revenueCurrentMonth))}
        {kpi("Por receber", eur(toReceive), toReceive > 0 ? "var(--danger)" : undefined)}
        {kpi("Despesas do mês", eur(overview.expensesCurrentMonth))}
        {kpi("Saldo do mês", eur(overview.balanceCurrentMonth), overview.balanceCurrentMonth < 0 ? "var(--danger)" : undefined)}
      </div>

      <section className="card" style={{ padding: "clamp(16px, 4vw, 22px)", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, flex: "1 1 200px" }}>
            Por receber <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>({items.length})</span>
          </h3>
          <FindStudentToPay referenceMonth={referenceMonth} />
        </div>
        <PorReceberList items={items} />
        <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>
          «Recebido» regista o valor indicado com a forma de pagamento escolhida (nas encomendas, confirma o pagamento como em Loja → Encomendas). Para outro valor, usa «Outro valor»; para vários meses de uma vez, «Vários meses».
        </p>
      </section>
    </div>
  );
}
