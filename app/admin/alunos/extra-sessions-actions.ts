"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseFinancePaymentMethodRequired } from "@/lib/finance-payment-method";
import { currentReferenceMonthLisbon } from "@/lib/lisbon-payment-dates";

export type ExtraSessionsActionResult = { error?: string; success?: boolean };

/**
 * Regista o pagamento de aulas extra (além do limite mensal do plano, ex.: Kingdom Week)
 * e concede-as de imediato ao aluno no mês de referência (StudentExtraSessions).
 */
export async function grantExtraSessions(
  _prev: ExtraSessionsActionResult | null,
  formData: FormData
): Promise<ExtraSessionsActionResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const studentId = (formData.get("studentId") as string)?.trim();
  const quantityStr = (formData.get("quantity") as string)?.trim();
  const amountStr = (formData.get("amount") as string)?.trim();
  const referenceMonth = (formData.get("referenceMonth") as string)?.trim() || currentReferenceMonthLisbon(new Date());
  const note = (formData.get("note") as string)?.trim() || null;

  if (!studentId) return { error: "Aluno inválido." };
  const quantity = parseInt(quantityStr ?? "", 10);
  if (Number.isNaN(quantity) || quantity < 1) return { error: "Quantidade de aulas deve ser um número ≥ 1." };
  const amount = parseFloat(amountStr ?? "");
  if (Number.isNaN(amount) || amount < 0) return { error: "Valor inválido." };
  if (!/^\d{4}-\d{2}$/.test(referenceMonth)) return { error: "Mês de referência inválido." };
  const methodResult = parseFinancePaymentMethodRequired(formData.get("paymentMethod") as string | null);
  if ("error" in methodResult) return { error: methodResult.error };

  const supabase = createAdminClient();

  const paymentId = crypto.randomUUID();
  const { error: paymentError } = await supabase.from("Payment").insert({
    id: paymentId,
    studentId,
    amount: amount.toFixed(2),
    status: "PAID",
    paymentType: "EXTRA_SESSION",
    referenceMonth,
    paymentMethod: methodResult.method,
  });
  if (paymentError) return { error: paymentError.message };

  const { error: grantError } = await supabase.from("StudentExtraSessions").insert({
    id: crypto.randomUUID(),
    studentId,
    referenceMonth,
    quantity,
    paymentId,
    note,
  });
  if (grantError) return { error: grantError.message };

  revalidatePath(`/admin/alunos/${studentId}`);
  revalidatePath("/admin/financeiro");
  return { success: true };
}
