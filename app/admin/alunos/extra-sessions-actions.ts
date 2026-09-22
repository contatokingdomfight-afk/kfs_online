"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseFinancePaymentMethodRequired } from "@/lib/finance-payment-method";
import { currentReferenceMonthLisbon } from "@/lib/lisbon-payment-dates";
import { executeExtraSessionsGrant } from "@/lib/extra-sessions-grant";
import { assertStaffCanManageStudentDropIn } from "@/lib/staff-drop-in-access";
import { adminPermissionError } from "@/lib/permissions/assert";

export type ExtraSessionsActionResult = { error?: string; success?: boolean };

/**
 * Regista pagamento de aulas avulsas/extra e concede-as no mês (StudentExtraSessions).
 * Admin ou coach (escola do aluno). Valor validado automaticamente (€10/aula ou pacote Week).
 */
export async function grantExtraSessions(
  _prev: ExtraSessionsActionResult | null,
  formData: FormData
): Promise<ExtraSessionsActionResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) return { error: "Não autorizado." };

  const studentId = (formData.get("studentId") as string)?.trim();
  const quantityStr = (formData.get("quantity") as string)?.trim();
  const amountStr = (formData.get("amount") as string)?.trim();
  const referenceMonth = (formData.get("referenceMonth") as string)?.trim() || currentReferenceMonthLisbon(new Date());
  const note = (formData.get("note") as string)?.trim() || null;
  const revalidateCoachPath = (formData.get("revalidateCoachPath") as string)?.trim() || null;

  if (!studentId) return { error: "Aluno inválido." };
  const quantity = parseInt(quantityStr ?? "", 10);
  if (Number.isNaN(quantity) || quantity < 1) return { error: "Quantidade de aulas deve ser um número ≥ 1." };
  const amount = parseFloat(amountStr ?? "");
  if (Number.isNaN(amount) || amount < 0) return { error: "Valor inválido." };
  if (!/^\d{4}-\d{2}$/.test(referenceMonth)) return { error: "Mês de referência inválido." };
  const methodResult = parseFinancePaymentMethodRequired(formData.get("paymentMethod") as string | null);
  if ("error" in methodResult) return { error: methodResult.error };

  const supabase = createAdminClient();
  const access = await assertStaffCanManageStudentDropIn(supabase, dbUser, studentId);
  if (!access.ok) return { error: access.error };
  const permErr = await adminPermissionError("admin:alunos:write");
  if (permErr) return { error: permErr };

  const result = await executeExtraSessionsGrant(supabase, {
    studentId,
    quantity,
    amount,
    referenceMonth,
    paymentMethod: methodResult.method,
    note,
  });
  if (result.error) return result;

  revalidatePath(`/admin/alunos/${studentId}`);
  revalidatePath(`/admin/alunos/${studentId}/plano-seguro`);
  revalidatePath(`/coach/alunos/${studentId}`);
  if (revalidateCoachPath) revalidatePath(revalidateCoachPath);
  revalidatePath("/admin/financeiro");
  revalidatePath("/coach/financeiro");
  return { success: true };
}
