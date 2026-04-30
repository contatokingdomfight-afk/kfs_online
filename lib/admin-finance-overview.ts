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

function monthDateBounds(yyyyMm: string): { start: string; end: string } {
  const [y, m] = yyyyMm.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return {
    start: `${yyyyMm}-01`,
    end: `${yyyyMm}-${String(lastDay).padStart(2, "0")}`,
  };
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
  const { start, end } = monthDateBounds(referenceMonth);
  const base: FinanceiroOverview = {
    referenceMonth,
    activeStudents: 0,
    revenueCurrentMonth: 0,
    expensesCurrentMonth: 0,
    expensesFixedMonth: 0,
    expensesVariableMonth: 0,
    balanceCurrentMonth: 0,
    allExpenses: [],
    expensesError: null,
    overviewError: null,
  };

  const { data: expenseRows, error: exErr } = await supabase
    .from("FinancialExpense")
    .select("id, amount, description, occurredOn, createdAt, kind")
    .order("occurredOn", { ascending: false })
    .order("createdAt", { ascending: false });

  if (exErr) {
    return { ...base, expensesError: exErr.message };
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
      expensesError: null,
      overviewError: stErr.message,
    };
  }
  const activeStudents = countActiveStudents(students ?? []);
  const studentIds = (students ?? []).map((s) => (s as { id: string }).id);

  let revenueCurrentMonth = 0;
  if (studentIds.length > 0) {
    const { data: payments, error: payErr } = await supabase
      .from("Payment")
      .select("amount")
      .eq("status", "PAID")
      .in("studentId", studentIds)
      .eq("referenceMonth", referenceMonth);
    if (payErr) {
      return {
        ...base,
        activeStudents,
        allExpenses: all,
        expensesCurrentMonth,
        expensesFixedMonth,
        expensesVariableMonth,
        balanceCurrentMonth: revenueCurrentMonth - expensesCurrentMonth,
        expensesError: null,
        overviewError: payErr.message,
      };
    }
    for (const p of payments ?? []) {
      revenueCurrentMonth += Number((p as { amount: string | number }).amount);
    }
  }

  return {
    referenceMonth,
    activeStudents,
    revenueCurrentMonth,
    expensesCurrentMonth,
    expensesFixedMonth,
    expensesVariableMonth,
    balanceCurrentMonth: revenueCurrentMonth - expensesCurrentMonth,
    allExpenses: all,
    expensesError: null,
    overviewError: null,
  };
}
