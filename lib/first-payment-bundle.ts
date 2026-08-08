import type { SupabaseClient } from "@supabase/supabase-js";
import type { FinancePaymentMethod } from "@/lib/finance-payment-method";
import { getInsuranceSettings } from "@/lib/insurance-settings";
import { upsertTuitionPayment } from "@/lib/payment-tuition-upsert";
import { renewStudentInsuranceCoverage } from "@/lib/renew-student-insurance-coverage";
import { hasPendingOnboardingPayments } from "@/lib/ensure-onboarding-pending-payments";
import { listConsecutiveReferenceMonths } from "@/lib/reference-month";
import {
  getStudentOnboardingFeesState,
  isStudentEligibleForFirstPayment,
} from "@/lib/student-onboarding-fees";

export type CreateFirstPaymentBundleInput = {
  studentId: string;
  referenceMonth: string;
  tuitionAmount: number;
  tuitionMonths?: number;
  includeEnrollment: boolean;
  includeInsurance: boolean;
  referenceYear: string;
  adminUserId: string;
  paymentMethod: FinancePaymentMethod;
};

export type CreateFirstPaymentBundleResult = { error?: string };

async function markEnrollmentPaid(
  supabase: SupabaseClient,
  studentId: string,
  amount: number,
  paymentMethod: FinancePaymentMethod
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
      .update({ amount: amount.toFixed(2), status: "PAID", paymentMethod })
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
      paymentMethod,
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

async function waiveInsurance(
  supabase: SupabaseClient,
  studentId: string,
  referenceYear: string
): Promise<{ error?: string }> {
  const { error: waiveErr } = await supabase
    .from("Student")
    .update({ insuranceFeeWaived: true })
    .eq("id", studentId);
  if (waiveErr) return { error: waiveErr.message };

  const { error: delErr } = await supabase
    .from("Payment")
    .delete()
    .eq("studentId", studentId)
    .eq("paymentType", "INSURANCE")
    .eq("referenceYear", referenceYear)
    .eq("status", "LATE");
  if (delErr) return { error: delErr.message };
  return {};
}

async function markInsurancePaid(
  supabase: SupabaseClient,
  studentId: string,
  referenceYear: string,
  amount: number,
  paymentMethod: FinancePaymentMethod
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
      .update({ amount: amount.toFixed(2), status: "PAID", paymentMethod })
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
      paymentMethod,
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
    tuitionMonths = 1,
    includeEnrollment,
    includeInsurance,
    referenceYear,
    adminUserId,
  } = input;
  const paymentMethod = input.paymentMethod;

  if (!/^\d{4}-\d{2}$/.test(referenceMonth)) return { error: "Mês de referência inválido." };
  if (!/^\d{4}$/.test(referenceYear)) return { error: "Ano de seguro inválido." };
  if (Number.isNaN(tuitionAmount) || tuitionAmount < 0) return { error: "Valor da mensalidade inválido." };
  const months = tuitionMonths ?? 1;
  if (!Number.isInteger(months) || months < 1 || months > 12) {
    return { error: "Número de meses deve ser entre 1 e 12." };
  }

  const [eligible, pending, fees] = await Promise.all([
    isStudentEligibleForFirstPayment(supabase, studentId),
    hasPendingOnboardingPayments(supabase, studentId),
    getStudentOnboardingFeesState(supabase, studentId, referenceYear),
  ]);

  if (!eligible && !pending) {
    return { error: "Este aluno já não tem pagamentos de inscrição pendentes." };
  }

  const settings = await getInsuranceSettings(supabase);

  if (includeInsurance && fees.showInsurance && settings.annualAmount <= 0) {
    return { error: "Valor do seguro não configurado em Configurações." };
  }

  if (includeEnrollment && fees.showEnrollment && settings.enrollmentAmount <= 0) {
    return { error: "Valor da matrícula não configurado em Configurações." };
  }

  const tuitionResult = await upsertTuitionPayment(supabase, {
    studentId,
    referenceMonth,
    amount: tuitionAmount,
    status: "PAID",
    paymentMethod,
  });
  if (tuitionResult.error) return { error: tuitionResult.error };

  if (months > 1) {
    const extraMonths = listConsecutiveReferenceMonths(referenceMonth, months).slice(1);
    for (const rm of extraMonths) {
      const extra = await upsertTuitionPayment(supabase, {
        studentId,
        referenceMonth: rm,
        amount: tuitionAmount,
        status: "PAID",
        paymentMethod,
      });
      if (extra.error) return { error: `${rm}: ${extra.error}` };
    }
  }

  if (fees.showEnrollment || fees.enrollmentWaived === false) {
    if (includeEnrollment && settings.enrollmentAmount > 0 && fees.showEnrollment) {
      const enrollResult = await markEnrollmentPaid(supabase, studentId, settings.enrollmentAmount, paymentMethod);
      if (enrollResult.error) return { error: `Matrícula: ${enrollResult.error}` };
      await supabase.from("Student").update({ enrollmentFeeWaived: false }).eq("id", studentId);
    } else if (fees.showEnrollment) {
      const waiveResult = await waiveEnrollment(supabase, studentId);
      if (waiveResult.error) return { error: waiveResult.error };
    }
  }

  if (fees.showInsurance) {
    if (includeInsurance) {
      const insResult = await markInsurancePaid(
        supabase,
        studentId,
        referenceYear,
        settings.annualAmount,
        paymentMethod
      );
      if (insResult.error) return { error: `Seguro: ${insResult.error}` };

      const renew = await renewStudentInsuranceCoverage(supabase, studentId, adminUserId);
      if (renew.error) return { error: renew.error };
    } else {
      const waiveResult = await waiveInsurance(supabase, studentId, referenceYear);
      if (waiveResult.error) return { error: waiveResult.error };
    }
  }

  return {};
}
