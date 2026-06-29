import type { SupabaseClient } from "@supabase/supabase-js";
import { getInsuranceSettings } from "@/lib/insurance-settings";
import { upsertTuitionPayment } from "@/lib/payment-tuition-upsert";
import { renewStudentInsuranceCoverage } from "@/lib/renew-student-insurance-coverage";
import {
  getStudentOnboardingFeesState,
  isStudentEligibleForFirstPayment,
} from "@/lib/student-onboarding-fees";

export type CreateFirstPaymentBundleInput = {
  studentId: string;
  referenceMonth: string;
  tuitionAmount: number;
  includeEnrollment: boolean;
  includeInsurance: boolean;
  referenceYear: string;
  adminUserId: string;
};

export type CreateFirstPaymentBundleResult = { error?: string };

/** Primeiro pagamento: mensalidade + matrícula (opcional) + seguro (obrigatório se pendente). */
export async function createFirstPaymentBundle(
  supabase: SupabaseClient,
  input: CreateFirstPaymentBundleInput
): Promise<CreateFirstPaymentBundleResult> {
  const {
    studentId,
    referenceMonth,
    tuitionAmount,
    includeEnrollment,
    includeInsurance,
    referenceYear,
    adminUserId,
  } = input;

  if (!/^\d{4}-\d{2}$/.test(referenceMonth)) return { error: "Mês de referência inválido." };
  if (!/^\d{4}$/.test(referenceYear)) return { error: "Ano de seguro inválido." };
  if (Number.isNaN(tuitionAmount) || tuitionAmount < 0) return { error: "Valor da mensalidade inválido." };

  const eligible = await isStudentEligibleForFirstPayment(supabase, studentId);
  if (!eligible) {
    return { error: "Este aluno já tem pagamentos registados. Usa «Registar pagamento» normal." };
  }

  const fees = await getStudentOnboardingFeesState(supabase, studentId, referenceYear);
  const settings = await getInsuranceSettings(supabase);

  if (includeInsurance && fees.showInsurance) {
    if (settings.annualAmount <= 0) return { error: "Valor do seguro não configurado em Configurações." };
  } else if (fees.showInsurance) {
    return { error: "O seguro é obrigatório no primeiro pagamento." };
  }

  if (includeEnrollment && fees.showEnrollment && settings.enrollmentAmount <= 0) {
    return { error: "Valor da matrícula não configurado em Configurações." };
  }

  const tuitionResult = await upsertTuitionPayment(supabase, {
    studentId,
    referenceMonth,
    amount: tuitionAmount,
    status: "PAID",
  });
  if (tuitionResult.error) return { error: tuitionResult.error };

  if (fees.showEnrollment) {
    if (includeEnrollment && settings.enrollmentAmount > 0) {
      const { error } = await supabase.from("Payment").insert({
        id: crypto.randomUUID(),
        studentId,
        amount: settings.enrollmentAmount.toFixed(2),
        status: "PAID",
        paymentType: "ENROLLMENT",
        referenceMonth: null,
        referenceYear: null,
      });
      if (error) return { error: `Matrícula: ${error.message}` };
      await supabase.from("Student").update({ enrollmentFeeWaived: false }).eq("id", studentId);
    } else {
      const { error } = await supabase
        .from("Student")
        .update({ enrollmentFeeWaived: true })
        .eq("id", studentId);
      if (error) return { error: error.message };
    }
  }

  if (includeInsurance && fees.showInsurance) {
    const { data: existingIns } = await supabase
      .from("Payment")
      .select("id")
      .eq("studentId", studentId)
      .eq("paymentType", "INSURANCE")
      .eq("referenceYear", referenceYear)
      .maybeSingle();

    if (existingIns?.id) {
      const { error } = await supabase
        .from("Payment")
        .update({ amount: settings.annualAmount.toFixed(2), status: "PAID" })
        .eq("id", existingIns.id);
      if (error) return { error: `Seguro: ${error.message}` };
    } else {
      const { error } = await supabase.from("Payment").insert({
        id: crypto.randomUUID(),
        studentId,
        amount: settings.annualAmount.toFixed(2),
        status: "PAID",
        paymentType: "INSURANCE",
        referenceYear,
        referenceMonth: null,
      });
      if (error) return { error: `Seguro: ${error.message}` };
    }

    const renew = await renewStudentInsuranceCoverage(supabase, studentId, adminUserId);
    if (renew.error) return { error: renew.error };
  }

  return {};
}
