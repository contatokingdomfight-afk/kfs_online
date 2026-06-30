import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { currentReferenceMonthLisbon } from "@/lib/lisbon-payment-dates";

export type FinancialExpenseKind = "FIXED" | "VARIABLE";

export type FinancialExpenseRow = {
  id: string;
  amount: number;
  description: string;
  occurredOn: string;
  createdAt: string;
  kind: FinancialExpenseKind;
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

export async function getFinanceiroOverview(supabase: SupabaseClient): Promise<FinanceiroOverview> {
  const referenceMonth = currentReferenceMonthLisbon(new Date());
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
    .select("id, amount, description, occurredOn, createdAt, kind")
    .order("occurredOn", { ascending: false })
    .order("createdAt", { ascending: false });

  if (withKind.error) {
    const msg = withKind.error.message ?? "";
    const kindMissing =
      /kind/i.test(msg) && (/does not exist|column/i.test(msg) || /42703/.test(msg));
    if (kindMissing) {
      const noKind = await supabase
        .from("FinancialExpense")
        .select("id, amount, description, occurredOn, createdAt")
        .order("occurredOn", { ascending: false })
        .order("createdAt", { ascending: false });
      if (noKind.error) {
        expensesError = noKind.error.message;
        expenseRows = [];
      } else {
        expenseRows = noKind.data as unknown[];
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
    };
    const kind: FinancialExpenseKind = x.kind === "FIXED" ? "FIXED" : "VARIABLE";
    return {
      id: x.id,
      amount: Number(x.amount),
      description: x.description,
      occurredOn: typeof x.occurredOn === "string" ? x.occurredOn.slice(0, 10) : String(x.occurredOn).slice(0, 10),
      createdAt: x.createdAt,
      kind,
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

  const revenueCurrentMonth = revenueTuitionMonth + revenueOnboardingMonth;

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
    overviewError: null,
  };
}
