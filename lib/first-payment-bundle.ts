import type { SupabaseClient } from "@supabase/supabase-js";
import { getInsuranceSettings } from "@/lib/insurance-settings";
import { upsertTuitionPayment } from "@/lib/payment-tuition-upsert";
import { renewStudentInsuranceCoverage } from "@/lib/renew-student-insurance-coverage";
import { hasPendingOnboardingPayments } from "@/lib/ensure-onboarding-pending-payments";
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

async function markEnrollmentPaid(
  supabase: SupabaseClient,
  studentId: string,
  amount: number
): Promise<{ error?: string }> {
  const { data: existing } = await supabase
    .from("Payment")
    .select("id")
    .eq("studentId", studentId)
    .eq("paymentType", "ENROLLMENT")
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("Payment")
      .update({ amount: amount.toFixed(2), status: "PAID" })
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("Payment").insert({
      id: crypto.randomUUID(),
      studentId,
      amount: amount.toFixed(2),
      status: "PAID",
      paymentType: "ENROLLMENT",
      referenceMonth: null,
      referenceYear: null,
    });
    if (error) return { error: error.message };
  }
  return {};
}

async function waiveEnrollment(
  supabase: SupabaseClient,
  studentId: string
): Promise<{ error?: string }> {
  const { error: waiveErr } = await supabase
    .from("Student")
    .update({ enrollmentFeeWaived: true })
    .eq("id", studentId);
  if (waiveErr) return { error: waiveErr.message };

  const { error: delErr } = await supabase
    .from("Payment")
    .delete()
    .eq("studentId", studentId)
    .eq("paymentType", "ENROLLMENT")
    .eq("status", "LATE");
  if (delErr) return { error: delErr.message };
  return {};
}

async function markInsurancePaid(
  supabase: SupabaseClient,
  studentId: string,
  referenceYear: string,
  amount: number
): Promise<{ error?: string }> {
  const { data: existing } = await supabase
    .from("Payment")
    .select("id")
    .eq("studentId", studentId)
    .eq("paymentType", "INSURANCE")
    .eq("referenceYear", referenceYear)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("Payment")
      .update({ amount: amount.toFixed(2), status: "PAID" })
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("Payment").insert({
      id: crypto.randomUUID(),
      studentId,
      amount: amount.toFixed(2),
      status: "PAID",
      paymentType: "INSURANCE",
      referenceYear,
      referenceMonth: null,
    });
    if (error) return { error: error.message };
  }
  return {};
}

/** Confirma primeiro pagamento: marca pendentes como PAID (matrícula opcional) + renova seguro. */
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

  const [eligible, pending, fees] = await Promise.all([
    isStudentEligibleForFirstPayment(supabase, studentId),
    hasPendingOnboardingPayments(supabase, studentId),
    getStudentOnboardingFeesState(supabase, studentId, referenceYear),
  ]);

  if (!eligible && !pending) {
    return { error: "Este aluno já não tem pagamentos de inscrição pendentes." };
  }

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

  if (fees.showEnrollment || fees.enrollmentWaived === false) {
    if (includeEnrollment && settings.enrollmentAmount > 0 && fees.showEnrollment) {
      const enrollResult = await markEnrollmentPaid(supabase, studentId, settings.enrollmentAmount);
      if (enrollResult.error) return { error: `Matrícula: ${enrollResult.error}` };
      await supabase.from("Student").update({ enrollmentFeeWaived: false }).eq("id", studentId);
    } else if (fees.showEnrollment) {
      const waiveResult = await waiveEnrollment(supabase, studentId);
      if (waiveResult.error) return { error: waiveResult.error };
    }
  }

  if (includeInsurance && fees.showInsurance) {
    const insResult = await markInsurancePaid(
      supabase,
      studentId,
      referenceYear,
      settings.annualAmount
    );
    if (insResult.error) return { error: `Seguro: ${insResult.error}` };

    const renew = await renewStudentInsuranceCoverage(supabase, studentId, adminUserId);
    if (renew.error) return { error: renew.error };
  }

  return {};
}
