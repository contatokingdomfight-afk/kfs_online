import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getRevenueBreakdown, type RevenueBreakdownRow } from "@/lib/admin-revenue-breakdown";
import { currentReferenceMonthLisbon } from "@/lib/lisbon-payment-dates";
import type { FinancialExpenseKind } from "@/lib/admin-finance-overview";
import { EXPENSE_CATEGORY_LABELS_PT, type ExpenseCategory } from "@/lib/retail/constants";

export type FinancialReportExpenseRow = {
  id: string;
  amount: number;
  description: string;
  occurredOn: string;
  kind: FinancialExpenseKind;
  category: ExpenseCategory;
};

export type FinancialReportMonth = {
  referenceMonth: string;
  revenueRows: RevenueBreakdownRow[];
  revenueTotal: number;
  revenueOnboarding: number;
  expensesTotal: number;
  expensesFixed: number;
  expensesVariable: number;
  balance: number;
  expenses: FinancialReportExpenseRow[];
  error: string | null;
};

export type FinancialReportHistoryPoint = {
  month: string;
  revenue: number;
  expenses: number;
  balance: number;
};

function monthDateBounds(yyyyMm: string): { start: string; end: string; endExclusiveIso: string } {
  const [y, m] = yyyyMm.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const start = `${yyyyMm}-01`;
  const end = `${yyyyMm}-${String(lastDay).padStart(2, "0")}`;
  const endNext = new Date(y, m, 1);
  return { start, end, endExclusiveIso: endNext.toISOString() };
}

function listRecentMonths(referenceMonth: string, count: number): string[] {
  const [y, m] = referenceMonth.split("-").map(Number);
  const out: string[] = [];
  let year = y;
  let month = m;
  for (let i = 0; i < count; i++) {
    out.unshift(`${year}-${String(month).padStart(2, "0")}`);
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
  }
  return out;
}

async function sumOnboardingPayments(
  supabase: SupabaseClient,
  referenceMonth: string
): Promise<number> {
  const { start, endExclusiveIso } = monthDateBounds(referenceMonth);
  const { data, error } = await supabase
    .from("Payment")
    .select("amount")
    .eq("status", "PAID")
    .in("paymentType", ["ENROLLMENT", "INSURANCE"])
    .gte("createdAt", `${start}T00:00:00.000Z`)
    .lt("createdAt", endExclusiveIso);
  if (error) return 0;
  return (data ?? []).reduce((s, p) => s + Number((p as { amount: string | number }).amount), 0);
}

export async function getFinancialReportForMonth(
  supabase: SupabaseClient,
  referenceMonth: string
): Promise<FinancialReportMonth> {
  const empty: FinancialReportMonth = {
    referenceMonth,
    revenueRows: [],
    revenueTotal: 0,
    revenueOnboarding: 0,
    expensesTotal: 0,
    expensesFixed: 0,
    expensesVariable: 0,
    balance: 0,
    expenses: [],
    error: null,
  };

  const { start, end } = monthDateBounds(referenceMonth);

  const [revenue, onboarding, expenseResult] = await Promise.all([
    getRevenueBreakdown(supabase, referenceMonth),
    sumOnboardingPayments(supabase, referenceMonth),
    supabase
      .from("FinancialExpense")
      .select("id, amount, description, occurredOn, kind, category")
      .gte("occurredOn", start)
      .lte("occurredOn", end)
      .order("occurredOn", { ascending: false }),
  ]);

  if (revenue.error) return { ...empty, error: revenue.error };

  const expenses: FinancialReportExpenseRow[] = (expenseResult.data ?? []).map((r) => {
    const x = r as {
      id: string;
      amount: string | number;
      description: string;
      occurredOn: string;
      kind?: string;
      category?: string;
    };
    const cat = (x.category ?? "OTHER") as ExpenseCategory;
    return {
      id: x.id,
      amount: Number(x.amount),
      description: x.description,
      occurredOn: typeof x.occurredOn === "string" ? x.occurredOn.slice(0, 10) : String(x.occurredOn).slice(0, 10),
      kind: x.kind === "FIXED" ? "FIXED" : "VARIABLE",
      category: EXPENSE_CATEGORY_LABELS_PT[cat] ? cat : "OTHER",
    };
  });

  let expensesTotal = 0;
  let expensesFixed = 0;
  let expensesVariable = 0;
  for (const e of expenses) {
    expensesTotal += e.amount;
    if (e.kind === "FIXED") expensesFixed += e.amount;
    else expensesVariable += e.amount;
  }

  const revenueTotal = revenue.total + onboarding;
  const balance = revenueTotal - expensesTotal;

  return {
    referenceMonth,
    revenueRows: revenue.rows,
    revenueTotal,
    revenueOnboarding: onboarding,
    expensesTotal,
    expensesFixed,
    expensesVariable,
    balance,
    expenses,
    error: expenseResult.error?.message ?? null,
  };
}

export async function getFinancialReportHistory(
  supabase: SupabaseClient,
  monthsBack = 6,
  referenceMonth?: string
): Promise<FinancialReportHistoryPoint[]> {
  const ref = referenceMonth ?? currentReferenceMonthLisbon(new Date());
  const months = listRecentMonths(ref, monthsBack);
  const points: FinancialReportHistoryPoint[] = [];
  for (const month of months) {
    const report = await getFinancialReportForMonth(supabase, month);
    points.push({
      month,
      revenue: report.revenueTotal,
      expenses: report.expensesTotal,
      balance: report.balance,
    });
  }
  return points;
}
