import { NextRequest, NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cron/authorize-cron";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendFinancialWeeklyAlertToAdmin } from "@/lib/notifications/email";
import { getFinancialReportForMonth } from "@/lib/admin-financial-report";
import { buildFinancialWeeklyAlertLines } from "@/lib/financial-alert-summary";
import { currentReferenceMonthLisbon } from "@/lib/lisbon-payment-dates";

/**
 * Cron semanal: resumo financeiro do mês corrente (receitas/despesas/saldo) + contagem de
 * alunos inadimplentes, por email ao admin (FINANCIAL_ALERT_ADMIN_EMAIL / ADMIN_ALERT_EMAIL).
 * GET /api/cron/financial-weekly-alert
 */
export async function GET(request: NextRequest) {
  if (!authorizeCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const referenceMonth = currentReferenceMonthLisbon(new Date());

  const [report, inadimplentesResult] = await Promise.all([
    getFinancialReportForMonth(supabase, referenceMonth),
    supabase.from("Student").select("id", { count: "exact", head: true }).eq("status", "INADIMPLENTE"),
  ]);

  if (report.error) {
    return NextResponse.json({ error: report.error }, { status: 500 });
  }
  if (inadimplentesResult.error) {
    return NextResponse.json({ error: inadimplentesResult.error.message }, { status: 500 });
  }

  const inadimplentesCount = inadimplentesResult.count ?? 0;
  const lines = buildFinancialWeeklyAlertLines(report, inadimplentesCount);

  const emailResult = await sendFinancialWeeklyAlertToAdmin(lines, referenceMonth);
  if (emailResult.error) {
    return NextResponse.json({ error: emailResult.error, referenceMonth, inadimplentesCount }, { status: 500 });
  }

  return NextResponse.json({ ok: true, referenceMonth, inadimplentesCount, emailed: true });
}
