import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { clearGraceOnPaidPayment, startGracePeriodOnLatePayment } from "@/lib/payment-grace";
import { syncStudentPaymentStatus } from "@/lib/student-payment-status";
import { upsertTuitionPayment } from "@/lib/payment-tuition-upsert";
import { listConsecutiveReferenceMonths } from "@/lib/reference-month";
import { getFamilyContext } from "@/lib/family-group";
import { familyGroupIdForTuition } from "@/lib/family-tuition";
import { tuitionStartMonthFromCreatedAt, isTuitionMonthBeforeEnrollment } from "@/lib/student-tuition-start";
import type { FinancePaymentMethod } from "@/lib/finance-payment-method";

/** Regista mensalidade(s) de um aluno (titular ou individual) e atualiza carência/estado. */
export async function registerTuitionPaymentCore(
  supabase: SupabaseClient,
  input: {
    studentId: string;
    amount: number;
    referenceMonth: string;
    status: "PAID" | "LATE";
    tuitionMonths: number;
    paymentMethod: FinancePaymentMethod | null;
  }
): Promise<{ error?: string }> {
  const { studentId, amount, referenceMonth, status, tuitionMonths, paymentMethod } = input;
  const familyCtx = await getFamilyContext(supabase, studentId);
  if (familyCtx && !familyCtx.isTitular) {
    return { error: "Aluno é membro de um grupo familiar; regista o pagamento no perfil do titular." };
  }

  const { data: studentRow } = await supabase
    .from("Student")
    .select("createdAt")
    .eq("id", studentId)
    .maybeSingle();
  if (!studentRow) return { error: "Aluno não encontrado." };
  const tuitionStartMonth = tuitionStartMonthFromCreatedAt(
    (studentRow as { createdAt: string }).createdAt
  );
  if (isTuitionMonthBeforeEnrollment(referenceMonth, tuitionStartMonth)) {
    return {
      error: `O aluno só entrou em ${tuitionStartMonth}. A mensalidade de ${referenceMonth} foi gerada por engano — usa «Anular cobrança indevida» em vez de registar pagamento.`,
    };
  }

  const familyGroupId = familyGroupIdForTuition(familyCtx);

  const monthList =
    status === "PAID" && tuitionMonths > 1
      ? listConsecutiveReferenceMonths(referenceMonth, tuitionMonths)
      : [referenceMonth];

  for (const month of monthList) {
    const upsertResult = await upsertTuitionPayment(supabase, {
      studentId,
      referenceMonth: month,
      amount,
      status: status as "PAID" | "LATE",
      familyGroupId,
      paymentMethod: status === "PAID" ? paymentMethod : null,
    });
    if (upsertResult.error) return { error: upsertResult.error };
  }

  if (status === "LATE") {
    await startGracePeriodOnLatePayment(supabase, studentId, referenceMonth);
  } else {
    await clearGraceOnPaidPayment(supabase, studentId);
  }

  await syncStudentPaymentStatus(supabase, studentId);
  return {};
}
