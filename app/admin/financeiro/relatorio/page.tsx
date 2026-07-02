import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { AdminConfigMissing } from "@/components/AdminConfigMissing";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { currentReferenceMonthLisbon } from "@/lib/lisbon-payment-dates";
import { getFinancialReportForMonth, getFinancialReportHistory } from "@/lib/admin-financial-report";
import { EXPENSE_CATEGORY_LABELS_PT } from "@/lib/retail/constants";
import { ExportCsvButton } from "@/components/admin/ExportCsvButton";
import { FinancialReportCharts } from "./FinancialReportCharts";
import { MonthSelector } from "../_components/MonthSelector";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ month?: string }>;

function formatMoney(n: number) {
  return n.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

function revenueCategoryLabel(category: string): string {
  switch (category) {
    case "PLAN":
      return "Plano";
    case "PLAN_NONE":
      return "Mensalidade (sem plano)";
    case "COURSE":
      return "Curso";
    case "EVENT":
      return "Evento";
    case "MANUAL":
      return "Manual";
    case "MERCHANDISE":
      return "Loja";
    default:
      return category;
  }
}

export default async function AdminFinanceiroRelatorioPage({ searchParams }: { searchParams: SearchParams }) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const defaultMonth = currentReferenceMonthLisbon(new Date());
  const referenceMonth = params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : defaultMonth;

  const result = getAdminClientOrNull();
  if (!result.client) return <AdminConfigMissing errorType={result.error} />;
  const supabase = result.client;

  const [report, history] = await Promise.all([
    getFinancialReportForMonth(supabase, referenceMonth),
    getFinancialReportHistory(supabase, 6, referenceMonth),
  ]);

  const periodLabel = new Date(referenceMonth + "-15T12:00:00Z").toLocaleDateString("pt-PT", {
    month: "long",
    year: "numeric",
  });

  const csvRows = [
    ...report.revenueRows.map((r) => ({
      tipo: "Receita",
      categoria: revenueCategoryLabel(r.category),
      descricao: r.label || r.category,
      valor: r.amount.toFixed(2),
      data: referenceMonth,
    })),
    ...(report.revenueOnboarding > 0
      ? [{ tipo: "Receita", categoria: "Matrícula/Seguro", descricao: "Onboarding", valor: report.revenueOnboarding.toFixed(2), data: referenceMonth }]
      : []),
    ...report.expenses.map((e) => ({
      tipo: "Despesa",
      categoria: EXPENSE_CATEGORY_LABELS_PT[e.category],
      descricao: e.description,
      valor: e.amount.toFixed(2),
      data: e.occurredOn,
    })),
    {
      tipo: "Saldo",
      categoria: "—",
      descricao: `Resultado ${referenceMonth}`,
      valor: report.balance.toFixed(2),
      data: referenceMonth,
    },
  ];

  return (
    <div style={{ maxWidth: "min(900px, 100%)" }}>
      <Link href="/admin/financeiro" style={{ color: "var(--text-secondary)", fontSize: 14, textDecoration: "none" }}>
        ← Financeiro
      </Link>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", margin: "8px 0 20px" }}>
        <h1 style={{ margin: 0, fontSize: "clamp(20px, 5vw, 24px)", fontWeight: 600, flex: 1 }}>
          Relatório — {periodLabel}
        </h1>
        <Suspense fallback={null}>
          <MonthSelector currentMonth={referenceMonth} label="Mês" />
        </Suspense>
      </div>

      {report.error && (
        <p role="alert" className="card" style={{ padding: 12, color: "var(--error)", marginBottom: 16 }}>
          {report.error}
        </p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Receitas</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{formatMoney(report.revenueTotal)}</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Despesas</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{formatMoney(report.expensesTotal)}</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Saldo</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: report.balance < 0 ? "var(--error)" : undefined }}>
            {formatMoney(report.balance)}
          </div>
        </div>
      </div>

      <FinancialReportCharts history={history} />

      <div style={{ margin: "20px 0" }}>
        <ExportCsvButton rows={csvRows} filename={`relatorio-financeiro-${referenceMonth}.csv`} />
      </div>

      <section className="card" style={{ padding: 16, marginBottom: 20 }}>
        <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600 }}>Receitas por origem</h2>
        {report.revenueRows.length === 0 && report.revenueOnboarding === 0 ? (
          <p style={{ color: "var(--text-secondary)", margin: 0 }}>Sem receitas neste mês.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <tbody>
              {report.revenueRows.map((r) => (
                <tr key={r.key} style={{ borderTop: "1px solid var(--card-border)" }}>
                  <td style={{ padding: 8 }}>{revenueCategoryLabel(r.category)}{r.label ? `: ${r.label}` : ""}</td>
                  <td style={{ padding: 8, textAlign: "right" }}>{formatMoney(r.amount)}</td>
                </tr>
              ))}
              {report.revenueOnboarding > 0 && (
                <tr style={{ borderTop: "1px solid var(--card-border)" }}>
                  <td style={{ padding: 8 }}>Matrícula / seguro</td>
                  <td style={{ padding: 8, textAlign: "right" }}>{formatMoney(report.revenueOnboarding)}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>

      <section className="card" style={{ padding: 16 }}>
        <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600 }}>Despesas do mês</h2>
        {report.expenses.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", margin: 0 }}>Sem despesas neste mês.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid var(--card-border)" }}>
                <th style={{ padding: 8 }}>Data</th>
                <th style={{ padding: 8 }}>Descrição</th>
                <th style={{ padding: 8 }}>Categoria</th>
                <th style={{ padding: 8, textAlign: "right" }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {report.expenses.map((e) => (
                <tr key={e.id} style={{ borderTop: "1px solid var(--card-border)" }}>
                  <td style={{ padding: 8 }}>{e.occurredOn}</td>
                  <td style={{ padding: 8 }}>{e.description}</td>
                  <td style={{ padding: 8 }}>{EXPENSE_CATEGORY_LABELS_PT[e.category]}</td>
                  <td style={{ padding: 8, textAlign: "right" }}>{formatMoney(e.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
