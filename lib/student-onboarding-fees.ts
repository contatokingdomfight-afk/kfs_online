import type { SupabaseClient } from "@supabase/supabase-js";
import { getInsuranceSettings } from "@/lib/insurance-settings";

export type StudentOnboardingFeesState = {
  enrollmentAmount: number;
  insuranceAmount: number;
  enrollmentWaived: boolean;
  enrollmentPaid: boolean;
  insuranceWaived: boolean;
  insurancePaidForYear: boolean;
  showEnrollment: boolean;
  showInsurance: boolean;
};

/** Estado das taxas de inscrição (matrícula + seguro) para um aluno. */
export async function getStudentOnboardingFeesState(
  supabase: SupabaseClient,
  studentId: string,
  referenceYear?: string
): Promise<StudentOnboardingFeesState> {
  const year = referenceYear ?? new Date().getFullYear().toString();
  const settings = await getInsuranceSettings(supabase);

  const [{ data: student }, { data: enrollmentPay }, { data: insurancePay }] = await Promise.all([
    supabase.from("Student").select("enrollmentFeeWaived, insuranceFeeWaived").eq("id", studentId).maybeSingle(),
    supabase
      .from("Payment")
      .select("id")
      .eq("studentId", studentId)
      .eq("paymentType", "ENROLLMENT")
      .eq("status", "PAID")
      .maybeSingle(),
    supabase
      .from("Payment")
      .select("id")
      .eq("studentId", studentId)
      .eq("paymentType", "INSURANCE")
      .eq("referenceYear", year)
      .eq("status", "PAID")
      .maybeSingle(),
  ]);

  const enrollmentWaived = Boolean(
    (student as { enrollmentFeeWaived?: boolean } | null)?.enrollmentFeeWaived
  );
  const insuranceWaived = Boolean(
    (student as { insuranceFeeWaived?: boolean } | null)?.insuranceFeeWaived
  );
  const enrollmentPaid = Boolean(enrollmentPay?.id);
  const insurancePaidForYear = Boolean(insurancePay?.id);

  const showEnrollment =
    settings.enrollmentAmount > 0 && !enrollmentWaived && !enrollmentPaid;
  const showInsurance = settings.annualAmount > 0 && !insuranceWaived && !insurancePaidForYear;

  return {
    enrollmentAmount: settings.enrollmentAmount,
    insuranceAmount: settings.annualAmount,
    enrollmentWaived,
    enrollmentPaid,
    insuranceWaived,
    insurancePaidForYear,
    showEnrollment,
    showInsurance,
  };
}

/** Aluno ainda sem qualquer pagamento PAID. */
export async function isStudentEligibleForFirstPayment(
  supabase: SupabaseClient,
  studentId: string
): Promise<boolean> {
  const { count } = await supabase
    .from("Payment")
    .select("id", { count: "exact", head: true })
    .eq("studentId", studentId)
    .eq("status", "PAID");
  return (count ?? 0) === 0;
}
