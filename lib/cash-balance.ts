import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  FINANCE_PAYMENT_METHODS,
  type FinancePaymentMethod,
  isBankPaymentMethod,
  isCashPaymentMethod,
  treasuryPaymentMethod,
} from "@/lib/finance-payment-method";

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

function emptyRevenueByMethod(): Record<FinancePaymentMethod, number> {
  return { CASH: 0, TRANSFER: 0, MBWAY: 0, DEPOSIT: 0 };
}

export type CashDepositRow = {
  id: string;
  amount: number;
  occurredOn: string;
  description: string | null;
  createdAt: string;
};

export type TreasuryBalanceSummary = {
  /** Saldo bancário acumulado (entradas bancárias + depósitos de espécie − despesas bancárias). */
  caixaBankTotal: number;
  /** Dinheiro físico ainda não depositado na conta. */
  physicalCashOnHand: number;
  /** Entradas do mês de referência por forma de pagamento (só receitas, não despesas). */
  revenueInMonthByMethod: Record<FinancePaymentMethod, number>;
  /** Depósitos de espécie na conta no mês de referência. */
  cashDepositsInMonth: number;
  recentCashDeposits: CashDepositRow[];
  treasuryError: string | null;
};

function addRevenueMonth(
  byMethod: Record<FinancePaymentMethod, number>,
  method: string | null | undefined,
  amount: number
) {
  const amt = Number(amount);
  if (!Number.isFinite(amt)) return;
  const resolved = treasuryPaymentMethod(method);
  if (!resolved) return;
  byMethod[resolved] += amt;
}

/**
 * Tesouraria registada na plataforma. Não substitui extrato bancário real.
 * - Caixa = conta acumulada
 * - Espécie em mão = físico − depósitos já registados
 * - Entradas do mês = receitas classificadas por forma de pagamento
 */
export async function getTreasuryBalances(
  supabase: SupabaseClient,
  referenceMonth: string
): Promise<TreasuryBalanceSummary> {
  const empty: TreasuryBalanceSummary = {
    caixaBankTotal: 0,
    physicalCashOnHand: 0,
    revenueInMonthByMethod: emptyRevenueByMethod(),
    cashDepositsInMonth: 0,
    recentCashDeposits: [],
    treasuryError: null,
  };
  const { start, end, endExclusiveIso } = monthDateBounds(referenceMonth);
  const revenueInMonthByMethod = emptyRevenueByMethod();

  let bankInTotal = 0;
  let bankOutTotal = 0;
  let cashInTotal = 0;
  let cashOutTotal = 0;
  let cashDepositsTotal = 0;
  let cashDepositsInMonth = 0;

  const [tuitionRes, onboardingRes, manualRes, retailRes, expenseRes, depositRes] = await Promise.all([
    supabase
      .from("Payment")
      .select("amount, paymentMethod, referenceMonth, status, paymentType")
      .eq("status", "PAID")
      .eq("paymentType", "TUITION"),
    supabase
      .from("Payment")
      .select("amount, paymentMethod, createdAt, status, paymentType")
      .eq("status", "PAID")
      .in("paymentType", ["ENROLLMENT", "INSURANCE"]),
    supabase.from("FinancialRevenue").select("amount, paymentMethod, occurredOn"),
    supabase.from("RetailSale").select("totalAmount, paymentMethod, soldAt, status").eq("status", "COMPLETED"),
    supabase.from("FinancialExpense").select("amount, paymentMethod, occurredOn"),
    supabase
      .from("TreasuryMovement")
      .select("id, amount, occurredOn, description, createdAt, kind")
      .eq("kind", "CASH_DEPOSIT")
      .order("occurredOn", { ascending: false })
      .order("createdAt", { ascending: false })
      .limit(20),
  ]);

  if (tuitionRes.error?.message && !/paymentMethod|column/i.test(tuitionRes.error.message)) {
    return { ...empty, treasuryError: tuitionRes.error.message };
  }

  const depositTableMissing =
    depositRes.error?.message &&
    (/TreasuryMovement|relation|does not exist|42P01/i.test(depositRes.error.message) ||
      /42703/.test(depositRes.error.message));

  type Pay = { amount: number; paymentMethod?: string | null; referenceMonth?: string; createdAt?: string };

  const addInflow = (method: string | null | undefined, amount: number, inMonth: boolean) => {
    const amt = Number(amount);
    if (!Number.isFinite(amt)) return;
    const resolved = treasuryPaymentMethod(method);
    if (!resolved) return;
    if (isCashPaymentMethod(resolved)) {
      cashInTotal += amt;
      if (inMonth) addRevenueMonth(revenueInMonthByMethod, resolved, amt);
    } else if (isBankPaymentMethod(resolved)) {
      bankInTotal += amt;
      if (inMonth) addRevenueMonth(revenueInMonthByMethod, resolved, amt);
    }
  };

  const addOutflow = (method: string | null | undefined, amount: number) => {
    const amt = Number(amount);
    if (!Number.isFinite(amt)) return;
    const resolved = treasuryPaymentMethod(method);
    if (!resolved) return;
    if (isCashPaymentMethod(resolved)) cashOutTotal += amt;
    else if (isBankPaymentMethod(resolved)) bankOutTotal += amt;
  };

  for (const p of (tuitionRes.data ?? []) as Pay[]) {
    addInflow(p.paymentMethod, p.amount, p.referenceMonth === referenceMonth);
  }

  for (const p of (onboardingRes.data ?? []) as Pay[]) {
    const created = p.createdAt ? String(p.createdAt) : "";
    addInflow(
      p.paymentMethod,
      p.amount,
      created >= `${start}T00:00:00.000Z` && created < endExclusiveIso
    );
  }

  for (const r of manualRes.data ?? []) {
    const row = r as { amount: number; paymentMethod?: string | null; occurredOn: string };
    const d =
      typeof row.occurredOn === "string" ? row.occurredOn.slice(0, 10) : String(row.occurredOn).slice(0, 10);
    addInflow(row.paymentMethod, row.amount, inMonthDate(d, start, end));
  }

  for (const s of retailRes.data ?? []) {
    const row = s as { totalAmount: number; paymentMethod?: string | null; soldAt: string };
    const sold = String(row.soldAt);
    addInflow(
      row.paymentMethod,
      row.totalAmount,
      sold >= `${start}T00:00:00.000Z` && sold < endExclusiveIso
    );
  }

  for (const e of expenseRes.data ?? []) {
    const row = e as { amount: number; paymentMethod?: string | null };
    addOutflow(row.paymentMethod, row.amount);
  }

  const recentCashDeposits: CashDepositRow[] = [];
  if (!depositRes.error && depositRes.data) {
    for (const d of depositRes.data) {
      const row = d as {
        id: string;
        amount: number;
        occurredOn: string;
        description?: string | null;
        createdAt: string;
      };
      const amt = Number(row.amount);
      cashDepositsTotal += amt;
      const on =
        typeof row.occurredOn === "string" ? row.occurredOn.slice(0, 10) : String(row.occurredOn).slice(0, 10);
      if (inMonthDate(on, start, end)) cashDepositsInMonth += amt;
      recentCashDeposits.push({
        id: row.id,
        amount: amt,
        occurredOn: on,
        description: row.description ?? null,
        createdAt: String(row.createdAt),
      });
    }
  }

  return {
    caixaBankTotal: bankInTotal - bankOutTotal + cashDepositsTotal,
    physicalCashOnHand: cashInTotal - cashOutTotal - cashDepositsTotal,
    revenueInMonthByMethod,
    cashDepositsInMonth,
    recentCashDeposits,
    treasuryError: depositTableMissing
      ? "Aplica a migração treasury_cash_deposit.sql para registar depósitos de espécie."
      : depositRes.error?.message ?? null,
  };
}

export { FINANCE_PAYMENT_METHODS };
