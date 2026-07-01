import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getStudentOnboardingFeesState,
  isStudentEligibleForFirstPayment,
  type StudentOnboardingFeesState,
} from "@/lib/student-onboarding-fees";
import { hasPendingOnboardingPayments } from "@/lib/ensure-onboarding-pending-payments";
import { getFamilyContext } from "@/lib/family-group";
import { resolvePlanMonthlyTuition } from "@/lib/family-tuition";

export type StudentPaymentRow = {
  studentId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  planName: string | null;
  priceMonthly: number;
  referenceMonth: string;
  existingPayment: { status: string; amount: number } | null;
  /** Aluno suspenso por falta de pagamento — marcar «Pago» repõe o plano. */
  isPaymentSuspended: boolean;
  /** Sem pagamentos PAID — ou com pacote de inscrição LATE pendente. */
  isFirstPaymentEligible: boolean;
  hasPendingOnboarding: boolean;
  onboardingFees: StudentOnboardingFeesState;
  /** Aluno no plano família (80 €/pessoa). */
  isInFamilyGroup?: boolean;
  /** Titular familiar: número de membros no grupo. */
  familyMemberCount?: number | null;
};

/**
 * Carrega dados para registar pagamento: utilizador, telefone, plano e pagamento já existente no mês.
 */
export async function loadStudentPaymentRows(
  supabase: SupabaseClient,
  studentIds: string[],
  referenceMonth: string
): Promise<StudentPaymentRow[]> {
  if (studentIds.length === 0) return [];

  const { data: students } = await supabase
    .from("Student")
    .select("id, userId, planId, suspendedPlanId, paymentSuspendedAt")
    .in("id", studentIds);

  if (!students?.length) return [];

  const userIds = [...new Set(students.map((s) => s.userId))];
  const planIds = [
    ...new Set(
      students
        .map((s) => {
          const row = s as {
            planId: string | null;
            suspendedPlanId?: string | null;
            paymentSuspendedAt?: string | null;
          };
          return row.planId ?? (row.paymentSuspendedAt ? row.suspendedPlanId : null) ?? row.suspendedPlanId;
        })
        .filter(Boolean)
    ),
  ] as string[];

  const [{ data: users }, { data: profiles }, { data: plans }, { data: payments }] = await Promise.all([
    supabase.from("User").select("id, name, email").in("id", userIds),
    supabase.from("StudentProfile").select("studentId, phone").in("studentId", studentIds),
    planIds.length
      ? supabase.from("Plan").select("id, name, priceMonthly").in("id", planIds)
      : Promise.resolve({ data: [] as { id: string; name: string | null; priceMonthly: number | null }[] }),
    supabase
      .from("Payment")
      .select("studentId, status, amount")
      .eq("referenceMonth", referenceMonth)
      .eq("paymentType", "TUITION")
      .in("studentId", studentIds),
  ]);

  const userById = new Map((users ?? []).map((u) => [u.id, u]));
  const profileByStudent = new Map((profiles ?? []).map((p) => [p.studentId, p]));
  const planById = new Map((plans ?? []).map((p) => [p.id, p]));
  const paymentByStudent = new Map((payments ?? []).map((p) => [p.studentId, p]));

  const referenceYear = referenceMonth.slice(0, 4);
  const [firstPaymentFlags, pendingFlags, onboardingFeesList, familyContexts] = await Promise.all([
    Promise.all(studentIds.map((id) => isStudentEligibleForFirstPayment(supabase, id))),
    Promise.all(studentIds.map((id) => hasPendingOnboardingPayments(supabase, id))),
    Promise.all(studentIds.map((id) => getStudentOnboardingFeesState(supabase, id, referenceYear))),
    Promise.all(studentIds.map((id) => getFamilyContext(supabase, id))),
  ]);
  const firstPaymentByStudent = new Map(studentIds.map((id, i) => [id, firstPaymentFlags[i]]));
  const pendingByStudent = new Map(studentIds.map((id, i) => [id, pendingFlags[i]]));
  const feesByStudent = new Map(studentIds.map((id, i) => [id, onboardingFeesList[i]]));
  const familyByStudent = new Map(studentIds.map((id, i) => [id, familyContexts[i]]));

  return students.map((s) => {
    const u = userById.get(s.userId);
    const prof = profileByStudent.get(s.id);
    const row = s as {
      planId: string | null;
      suspendedPlanId?: string | null;
      paymentSuspendedAt?: string | null;
    };
    const effectivePlanId =
      row.planId ?? (row.paymentSuspendedAt ? row.suspendedPlanId : null) ?? row.suspendedPlanId ?? null;
    const plan = effectivePlanId ? planById.get(effectivePlanId) : undefined;
    const pay = paymentByStudent.get(s.id);
    const familyCtx = familyByStudent.get(s.id);
    return {
      studentId: s.id,
      name: u?.name ?? null,
      email: u?.email ?? null,
      phone: (prof as { phone?: string | null } | undefined)?.phone ?? null,
      planName: plan?.name ?? null,
      priceMonthly: resolvePlanMonthlyTuition(
        effectivePlanId,
        Number(plan?.priceMonthly ?? 0),
        Boolean(familyCtx)
      ),
      referenceMonth,
      existingPayment: pay
        ? { status: String((pay as { status: string }).status), amount: Number((pay as { amount: number }).amount) }
        : null,
      isPaymentSuspended: Boolean(row.paymentSuspendedAt && !row.planId && row.suspendedPlanId),
      isFirstPaymentEligible: firstPaymentByStudent.get(s.id) ?? false,
      hasPendingOnboarding: pendingByStudent.get(s.id) ?? false,
      onboardingFees: feesByStudent.get(s.id) ?? {
        enrollmentAmount: 0,
        insuranceAmount: 0,
        enrollmentWaived: false,
        enrollmentPaid: false,
        insurancePaidForYear: false,
        showEnrollment: false,
        showInsurance: false,
      },
      isInFamilyGroup: Boolean(familyCtx),
      familyMemberCount: familyCtx?.memberCount ?? null,
    };
  });
}
