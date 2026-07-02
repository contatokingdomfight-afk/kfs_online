import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { isCashPaymentMethod } from "@/lib/finance-payment-method";

function monthDateBounds(yyyyMm: string): { start: string; end: string; endExclusiveIso: string } {
  const [y, m] = yyyyMm.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const start = `${yyyyMm}-01`;
  const end = `${yyyyMm}-${String(lastDay).padStart(2, "0")}`;
  const endNext = new Date(y, m, 1);
  return { start, end, endExclusiveIso: endNext.toISOString() };
}

function inMonthDate(occurredOn: string, start: string, end: string): boolean {
  const d = occurredOn.slice(0, 10);
  return d >= start && d <= end;
}

export type CashBalanceSummary = {
  /** Entradas em espécie − saídas em espécie (todos os registos). */
  cashOnHandTotal: number;
  /** Movimento líquido em espécie no mês de referência. */
  cashNetMonth: number;
  cashInMonth: number;
  cashOutMonth: number;
};

function sumCashAmounts(rows: { amount: number; paymentMethod?: string | null }[]): number {
  let t = 0;
  for (const r of rows) {
    if (isCashPaymentMethod(r.paymentMethod)) t += r.amount;
  }
  return t;
}

/**
 * Caixa em espécie: soma entradas CASH (pagamentos PAID, receitas manuais, loja) menos despesas CASH.
 * Registos sem forma de pagamento não entram no cálculo.
 */
export async function getCashBalance(
  supabase: SupabaseClient,
  referenceMonth: string
): Promise<CashBalanceSummary> {
  const empty: CashBalanceSummary = {
    cashOnHandTotal: 0,
    cashNetMonth: 0,
    cashInMonth: 0,
    cashOutMonth: 0,
  };
  const { start, end, endExclusiveIso } = monthDateBounds(referenceMonth);

  const [
    tuitionRes,
    onboardingRes,
    manualRes,
    retailRes,
    expenseRes,
  ] = await Promise.all([
    supabase.from("Payment").select("amount, paymentMethod, referenceMonth, status, paymentType").eq("status", "PAID").eq("paymentType", "TUITION"),
    supabase
      .from("Payment")
      .select("amount, paymentMethod, createdAt, status, paymentType")
      .eq("status", "PAID")
      .in("paymentType", ["ENROLLMENT", "INSURANCE"]),
    supabase.from("FinancialRevenue").select("amount, paymentMethod, occurredOn"),
    supabase.from("RetailSale").select("totalAmount, paymentMethod, soldAt, status").eq("status", "COMPLETED"),
    supabase.from("FinancialExpense").select("amount, paymentMethod, occurredOn"),
  ]);

  if (tuitionRes.error?.message && !/paymentMethod|column/i.test(tuitionRes.error.message)) {
    return empty;
  }

  type Pay = { amount: number; paymentMethod?: string | null; referenceMonth?: string; createdAt?: string };
  const tuition = (tuitionRes.data ?? []) as Pay[];
  const onboarding = (onboardingRes.data ?? []) as Pay[];

  let cashInTotal = 0;
  let cashInMonth = 0;

  for (const p of tuition) {
    const amt = Number(p.amount);
    if (!isCashPaymentMethod(p.paymentMethod)) continue;
    cashInTotal += amt;
    if (p.referenceMonth === referenceMonth) cashInMonth += amt;
  }

  for (const p of onboarding) {
    const amt = Number(p.amount);
    if (!isCashPaymentMethod(p.paymentMethod)) continue;
    const created = p.createdAt ? String(p.createdAt) : "";
    cashInTotal += amt;
    if (created >= `${start}T00:00:00.000Z` && created < endExclusiveIso) cashInMonth += amt;
  }

  for (const r of manualRes.data ?? []) {
    const row = r as { amount: number; paymentMethod?: string | null; occurredOn: string };
    const amt = Number(row.amount);
    if (!isCashPaymentMethod(row.paymentMethod)) continue;
    const d = typeof row.occurredOn === "string" ? row.occurredOn.slice(0, 10) : String(row.occurredOn).slice(0, 10);
    cashInTotal += amt;
    if (inMonthDate(d, start, end)) cashInMonth += amt;
  }

  for (const s of retailRes.data ?? []) {
    const row = s as { totalAmount: number; paymentMethod?: string | null; soldAt: string };
    const amt = Number(row.totalAmount);
    if (!isCashPaymentMethod(row.paymentMethod)) continue;
    const sold = String(row.soldAt);
    cashInTotal += amt;
    if (sold >= `${start}T00:00:00.000Z` && sold < endExclusiveIso) cashInMonth += amt;
  }

  let cashOutTotal = 0;
  let cashOutMonth = 0;
  for (const e of expenseRes.data ?? []) {
    const row = e as { amount: number; paymentMethod?: string | null; occurredOn: string };
    const amt = Number(row.amount);
    if (!isCashPaymentMethod(row.paymentMethod)) continue;
    const d = typeof row.occurredOn === "string" ? row.occurredOn.slice(0, 10) : String(row.occurredOn).slice(0, 10);
    cashOutTotal += amt;
    if (inMonthDate(d, start, end)) cashOutMonth += amt;
  }

  return {
    cashOnHandTotal: cashInTotal - cashOutTotal,
    cashNetMonth: cashInMonth - cashOutMonth,
    cashInMonth,
    cashOutMonth,
  };
}
