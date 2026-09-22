import type { FinancialReportMonth } from "@/lib/admin-financial-report";

function formatMoney(n: number): string {
  return n.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

/**
 * Linhas do resumo financeiro semanal enviado por email ao admin (cron `financial-weekly-alert`).
 * Função pura de formatação (sem acesso a BD), para poder ser testada isoladamente.
 */
export function buildFinancialWeeklyAlertLines(
  report: Pick<FinancialReportMonth, "revenueTotal" | "expensesTotal" | "balance">,
  inadimplentesCount: number
): string[] {
  return [
    `Receitas do mês: ${formatMoney(report.revenueTotal)}`,
    `Despesas do mês: ${formatMoney(report.expensesTotal)}`,
    `Saldo: ${formatMoney(report.balance)}${report.balance < 0 ? " ⚠️" : ""}`,
    `Alunos inadimplentes: ${inadimplentesCount}${inadimplentesCount > 0 ? " ⚠️" : ""}`,
  ];
}
