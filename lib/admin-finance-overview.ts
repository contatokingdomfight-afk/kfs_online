import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { currentReferenceMonthLisbon } from "@/lib/lisbon-payment-dates";
import { getRevenueBreakdown } from "@/lib/admin-revenue-breakdown";
import type { ExpenseCategory } from "@/lib/retail/constants";

export type FinancialExpenseKind = "FIXED" | "VARIABLE";

export type FinancialExpenseRow = {
  id: string;
  amount: number;
  description: string;
  occurredOn: string;
  createdAt: string;
  kind: FinancialExpenseKind;
  category: ExpenseCategory;
};

function monthDateBounds(yyyyMm: string): { start: string; end: string; endExclusiveIso: string } {
  const [y, m] = yyyyMm.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const start = `${yyyyMm}-01`;
  const end = `${yyyyMm}-${String(lastDay).padStart(2, "0")}`;
  const endNext = new Date(y, m, 1);
  return { start, end, endExclusiveIso: endNext.toISOString() };
}

/**
 * Alunos com plano e status ATIVO (mesma lógica que o dashboard).
 */
function countActiveStudents(
  students: { planId?: string | null; status?: string }[] | null
): number {
  let n = 0;
  for (const s of students ?? []) {
    if (s.planId && s.status === "ATIVO") n++;
  }
  return n;
}

export type FinanceiroOverview = {
  referenceMonth: string;
  activeStudents: number;
  /** Mensalidades PAID com referenceMonth = mês corrente. */
  revenueTuitionMonth: number;
  /** Matrícula + seguro PAID registados no mês (createdAt). */
  revenueOnboardingMonth: number;
  /** Soma das duas (caixa total de pagamentos de alunos no mês). */
  revenueCurrentMonth: number;
  expensesCurrentMonth: number;
  /** Soma das despesas com data no mês e kind FIXED. */
  expensesFixedMonth: number;
  /** Soma das despesas com data no mês e kind VARIABLE. */
  expensesVariableMonth: number;
  balanceCurrentMonth: number;
  allExpenses: FinancialExpenseRow[];
  expensesError: string | null;
  overviewError: string | null;
};

export async function getFinanceiroOverview(
  supabase: SupabaseClient,
  referenceMonthOverride?: string
): Promise<FinanceiroOverview> {
  const referenceMonth =
    referenceMonthOverride && /^\d{4}-\d{2}$/.test(referenceMonthOverride)
      ? referenceMonthOverride
      : currentReferenceMonthLisbon(new Date());
  const { start, end, endExclusiveIso } = monthDateBounds(referenceMonth);
  const base: FinanceiroOverview = {
    referenceMonth,
    activeStudents: 0,
    revenueTuitionMonth: 0,
    revenueOnboardingMonth: 0,
    revenueCurrentMonth: 0,
    expensesCurrentMonth: 0,
    expensesFixedMonth: 0,
    expensesVariableMonth: 0,
    balanceCurrentMonth: 0,
    allExpenses: [],
    expensesError: null,
    overviewError: null,
  };

  let expenseRows: unknown[] | null = null;
  let expensesError: string | null = null;

  const withKind = await supabase
    .from("FinancialExpense")
    .select("id, amount, description, occurredOn, createdAt, kind, category")
    .order("occurredOn", { ascending: false })
    .order("createdAt", { ascending: false });

  if (withKind.error) {
    const msg = withKind.error.message ?? "";
    const colMissing =
      (/kind|category/i.test(msg) && (/does not exist|column/i.test(msg) || /42703/.test(msg)));
    if (colMissing) {
      const fallback = await supabase
        .from("FinancialExpense")
        .select("id, amount, description, occurredOn, createdAt")
        .order("occurredOn", { ascending: false })
        .order("createdAt", { ascending: false });
      if (fallback.error) {
        expensesError = fallback.error.message;
        expenseRows = [];
      } else {
        expenseRows = fallback.data as unknown[];
        expensesError = null;
      }
    } else {
      expensesError = withKind.error.message;
      expenseRows = [];
    }
  } else {
    expenseRows = withKind.data as unknown[];
  }

  const all: FinancialExpenseRow[] = (expenseRows ?? []).map((r) => {
    const x = r as {
      id: string;
      amount: string | number;
      description: string;
      occurredOn: string;
      createdAt: string;
      kind?: string;
      category?: string;
    };
    const kind: FinancialExpenseKind = x.kind === "FIXED" ? "FIXED" : "VARIABLE";
    const category = (x.category ?? "OTHER") as ExpenseCategory;
    return {
      id: x.id,
      amount: Number(x.amount),
      description: x.description,
      occurredOn: typeof x.occurredOn === "string" ? x.occurredOn.slice(0, 10) : String(x.occurredOn).slice(0, 10),
      createdAt: x.createdAt,
      kind,
      category,
    };
  });

  let expensesCurrentMonth = 0;
  let expensesFixedMonth = 0;
  let expensesVariableMonth = 0;
  for (const e of all) {
    if (e.occurredOn >= start && e.occurredOn <= end) {
      expensesCurrentMonth += e.amount;
      if (e.kind === "FIXED") expensesFixedMonth += e.amount;
      else expensesVariableMonth += e.amount;
    }
  }

  const { data: students, error: stErr } = await supabase.from("Student").select("id, planId, status");
  if (stErr) {
    return {
      ...base,
      allExpenses: all,
      expensesCurrentMonth,
      expensesFixedMonth,
      expensesVariableMonth,
      balanceCurrentMonth: 0 - expensesCurrentMonth,
      expensesError,
      overviewError: stErr.message,
    };
  }
  const activeStudents = countActiveStudents(students ?? []);
  const studentIds = (students ?? []).map((s) => (s as { id: string }).id);

  let revenueTuitionMonth = 0;
  let revenueOnboardingMonth = 0;
  if (studentIds.length > 0) {
    const [{ data: tuitionPayments, error: tuitionErr }, { data: onboardingPayments, error: onboardingErr }] =
      await Promise.all([
        supabase
          .from("Payment")
          .select("amount")
          .eq("status", "PAID")
          .eq("paymentType", "TUITION")
          .in("studentId", studentIds)
          .eq("referenceMonth", referenceMonth),
        supabase
          .from("Payment")
          .select("amount")
          .eq("status", "PAID")
          .in("paymentType", ["ENROLLMENT", "INSURANCE"])
          .in("studentId", studentIds)
          .gte("createdAt", `${start}T00:00:00.000Z`)
          .lt("createdAt", endExclusiveIso),
      ]);

    const payErr = tuitionErr ?? onboardingErr;
    if (payErr) {
      return {
        ...base,
        activeStudents,
        allExpenses: all,
        expensesCurrentMonth,
        expensesFixedMonth,
        expensesVariableMonth,
        balanceCurrentMonth: 0 - expensesCurrentMonth,
        expensesError,
        overviewError: payErr.message,
      };
    }

    for (const p of tuitionPayments ?? []) {
      revenueTuitionMonth += Number((p as { amount: string | number }).amount);
    }
    for (const p of onboardingPayments ?? []) {
      revenueOnboardingMonth += Number((p as { amount: string | number }).amount);
    }
  }

  const revenueBreakdown = await getRevenueBreakdown(supabase, referenceMonth);
  const revenueFromSources = revenueBreakdown.error ? 0 : revenueBreakdown.total;
  const revenueCurrentMonth = revenueFromSources + revenueOnboardingMonth;
  const overviewError = revenueBreakdown.error ?? null;

  return {
    referenceMonth,
    activeStudents,
    revenueTuitionMonth,
    revenueOnboardingMonth,
    revenueCurrentMonth,
    expensesCurrentMonth,
    expensesFixedMonth,
    expensesVariableMonth,
    balanceCurrentMonth: revenueCurrentMonth - expensesCurrentMonth,
    allExpenses: all,
    expensesError: expensesError,
    overviewError,
  };
}
