import type { SupabaseClient } from "@supabase/supabase-js";
import { currentReferenceMonthLisbon } from "@/lib/lisbon-payment-dates";
import { getInsuranceSettings } from "@/lib/insurance-settings";
import { upsertTuitionPayment } from "@/lib/payment-tuition-upsert";
import { syncStudentPaymentStatus } from "@/lib/student-payment-status";
import { getFamilyContext } from "@/lib/family-context";
import {
  familyGroupIdForTuition,
  resolvePlanMonthlyTuition,
  resolveFamilyGroupTitularSuggestedAmount,
} from "@/lib/family-tuition";
import { syncPendingInsuranceAmounts } from "@/lib/sync-pending-insurance-amount";

export type EnsureOnboardingPendingOptions = {
  referenceMonth?: string;
  referenceYear?: string;
  /** Quando a mensalidade é cobrada via Stripe, não criar TUITION LATE. */
  skipTuition?: boolean;
};

async function upsertLatePayment(
  supabase: SupabaseClient,
  params: {
    studentId: string;
    paymentType: "ENROLLMENT" | "INSURANCE";
    amount: number;
    referenceYear?: string;
  }
): Promise<{ error?: string }> {
  const { studentId, paymentType, amount, referenceYear } = params;

  let query = supabase
    .from("Payment")
    .select("id, status")
    .eq("studentId", studentId)
    .eq("paymentType", paymentType);

  if (paymentType === "INSURANCE" && referenceYear) {
    query = query.eq("referenceYear", referenceYear);
  }

  const { data: existingRows, error: existingErr } = await query;
  if (existingErr) return { error: existingErr.message };

  const rows = existingRows ?? [];
  if (rows.some((r) => (r as { status: string }).status === "PAID")) {
    return {};
  }

  const lateRow = rows.find((r) => (r as { status: string }).status === "LATE");
  if (lateRow) {
    const { error } = await supabase
      .from("Payment")
      .update({ amount: amount.toFixed(2), status: "LATE" })
      .eq("id", (lateRow as { id: string }).id);
    if (error) return { error: error.message };
    return {};
  }

  if (rows.length > 0) {
    return {};
  }

  const { error } = await supabase.from("Payment").insert({
    id: crypto.randomUUID(),
    studentId,
    amount: amount.toFixed(2),
    status: "LATE",
    paymentType,
    referenceMonth: null,
    referenceYear: paymentType === "INSURANCE" ? referenceYear ?? null : null,
  });
  if (error) return { error: error.message };
  return {};
}

/**
 * Ao atribuir plano pela primeira vez, cria pagamentos LATE: mensalidade (opcional),
 * matrícula (se configurada e não isenta) e seguro anual (obrigatório se configurado).
 */
export async function ensureOnboardingPendingPayments(
  supabase: SupabaseClient,
  studentId: string,
  planId: string,
  options?: EnsureOnboardingPendingOptions
): Promise<{ error?: string; created: boolean }> {
  const referenceMonth = options?.referenceMonth ?? currentReferenceMonthLisbon(new Date());
  const referenceYear = options?.referenceYear ?? referenceMonth.slice(0, 4);

  const [{ data: plan }, settings, { data: student }] = await Promise.all([
    supabase.from("Plan").select("priceMonthly").eq("id", planId).eq("isActive", true).maybeSingle(),
    getInsuranceSettings(supabase),
    supabase.from("Student").select("enrollmentFeeWaived, insuranceFeeWaived, adminGrantedFullAccess").eq("id", studentId).maybeSingle(),
  ]);

  if (!plan) return { error: "Plano inválido ou inativo.", created: false };
  if ((student as { adminGrantedFullAccess?: boolean } | null)?.adminGrantedFullAccess) {
    return { created: false };
  }

  const enrollmentWaived = Boolean(
    (student as { enrollmentFeeWaived?: boolean } | null)?.enrollmentFeeWaived
  );
  const insuranceWaived = Boolean(
    (student as { insuranceFeeWaived?: boolean } | null)?.insuranceFeeWaived
  );
  let created = false;

  const familyCtx = await getFamilyContext(supabase, studentId);
  const isFamilyMember = Boolean(familyCtx && !familyCtx.isTitular);

  if (!options?.skipTuition && !isFamilyMember) {
    const tuitionAmount = familyCtx
      ? await resolveFamilyGroupTitularSuggestedAmount(supabase, familyCtx.group.id)
      : resolvePlanMonthlyTuition(planId, Number(plan.priceMonthly ?? 0));
    const { data: existingTuition } = await supabase
      .from("Payment")
      .select("id")
      .eq("studentId", studentId)
      .eq("referenceMonth", referenceMonth)
      .eq("paymentType", "TUITION")
      .maybeSingle();

    if (!existingTuition?.id) {
      const result = await upsertTuitionPayment(supabase, {
        studentId,
        referenceMonth,
        amount: tuitionAmount,
        status: "LATE",
        familyGroupId: familyGroupIdForTuition(familyCtx),
      });
      if (result.error) return { error: result.error, created: false };
      created = true;
    }
  }

  if (settings.enrollmentAmount > 0 && !enrollmentWaived) {
    const { data: existingEnrollment } = await supabase
      .from("Payment")
      .select("id")
      .eq("studentId", studentId)
      .eq("paymentType", "ENROLLMENT")
      .maybeSingle();

    if (!existingEnrollment?.id) {
      const result = await upsertLatePayment(supabase, {
        studentId,
        paymentType: "ENROLLMENT",
        amount: settings.enrollmentAmount,
      });
      if (result.error) return { error: result.error, created };
      created = true;
    }
  }

  if (settings.annualAmount > 0 && !insuranceWaived) {
    const result = await upsertLatePayment(supabase, {
      studentId,
      paymentType: "INSURANCE",
      amount: settings.annualAmount,
      referenceYear,
    });
    if (result.error) return { error: result.error, created };
    created = true;
  }

  await syncPendingInsuranceAmounts(supabase, { studentId, referenceYear });

  if (created) {
    await syncStudentPaymentStatus(supabase, studentId);
  }

  return { created };
}

/** Aluno com pagamentos de inscrição ainda em LATE (matrícula/seguro, ou pacote inicial sem qualquer PAID). */
export async function hasPendingOnboardingPayments(
  supabase: SupabaseClient,
  studentId: string
): Promise<boolean> {
  const [{ count: onboardingLate }, { count: paidCount }] = await Promise.all([
    supabase
      .from("Payment")
      .select("id", { count: "exact", head: true })
      .eq("studentId", studentId)
      .eq("status", "LATE")
      .in("paymentType", ["ENROLLMENT", "INSURANCE"]),
    supabase
      .from("Payment")
      .select("id", { count: "exact", head: true })
      .eq("studentId", studentId)
      .eq("status", "PAID"),
  ]);

  if ((onboardingLate ?? 0) > 0) return true;
  if ((paidCount ?? 0) > 0) return false;

  const { count: tuitionLate } = await supabase
    .from("Payment")
    .select("id", { count: "exact", head: true })
    .eq("studentId", studentId)
    .eq("status", "LATE")
    .eq("paymentType", "TUITION");

  return (tuitionLate ?? 0) > 0;
}
