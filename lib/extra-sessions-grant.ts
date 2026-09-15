import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { FinancePaymentMethod } from "@/lib/finance-payment-method";
import {
  amountsMatchForDropIn,
  calculateDropInPrice,
} from "@/lib/drop-in-sessions-pricing";
import { getDropInPricingContext } from "@/lib/extra-sessions-context";

export type ExecuteExtraSessionsGrantParams = {
  studentId: string;
  quantity: number;
  amount: number;
  referenceMonth: string;
  paymentMethod: FinancePaymentMethod;
  note?: string | null;
};

export type ExecuteExtraSessionsGrantResult = { error?: string; success?: boolean };

/**
 * Regista pagamento EXTRA_SESSION e concede aulas no mês (StudentExtraSessions).
 * Valida o valor face às regras comerciais (€10/aula ou pacote Week 4×€25).
 */
export async function executeExtraSessionsGrant(
  supabase: SupabaseClient,
  params: ExecuteExtraSessionsGrantParams
): Promise<ExecuteExtraSessionsGrantResult> {
  const { studentId, quantity, amount, referenceMonth, paymentMethod } = params;
  let note = params.note?.trim() || null;

  const pricingCtx = await getDropInPricingContext(supabase, studentId, referenceMonth);
  const quote = calculateDropInPrice(quantity, pricingCtx);

  if (!amountsMatchForDropIn(quote.amountEur, amount)) {
    return {
      error: `Valor incorreto. Para ${quote.quantity} aula(s) o total esperado é €${quote.amountEur.toFixed(2)}.`,
    };
  }

  if (!note && quote.bundleApplied) {
    note = quote.summaryLabel;
  }

  const paymentId = crypto.randomUUID();
  const { error: paymentError } = await supabase.from("Payment").insert({
    id: paymentId,
    studentId,
    amount: quote.amountEur.toFixed(2),
    status: "PAID",
    paymentType: "EXTRA_SESSION",
    referenceMonth,
    paymentMethod,
  });
  if (paymentError) return { error: paymentError.message };

  const { error: grantError } = await supabase.from("StudentExtraSessions").insert({
    id: crypto.randomUUID(),
    studentId,
    referenceMonth,
    quantity: quote.quantity,
    paymentId,
    note,
  });
  if (grantError) return { error: grantError.message };

  return { success: true };
}
