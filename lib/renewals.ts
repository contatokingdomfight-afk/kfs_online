/**
 * Renovação automática de planos: alunos com plano e mensalidades por mês.
 * - Listar alunos com plano que ainda não têm pagamento no mês de referência.
 * - Gerar registos de Payment (mensalidades) para o mês com status LATE.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  shouldGenerateLatePayments,
} from "@/lib/lisbon-payment-dates";
import { startGracePeriodOnLatePayment } from "@/lib/payment-grace";
import { syncStudentPaymentStatus } from "@/lib/student-payment-status";
import { resolvePlanMonthlyTuition, resolveFamilyGroupTitularSuggestedAmount } from "@/lib/family-tuition";
import { tuitionStartMonthFromCreatedAt, isTuitionMonthBeforeEnrollment } from "@/lib/student-tuition-start";

export type RenewalPending = {
  studentId: string;
  studentName: string;
  studentEmail: string;
  planId: string;
  planName: string;
  priceMonthly: number;
  familyGroupId: string | null;
};

export type GetRenewalsPendingOptions = {
  /**
   * Para criar registo LATE: excluir quem já tem qualquer Payment nesse mês (evita duplicar).
   * Para listagens (admin): omitir — mostra quem ainda não tem PAID (inclui quem já tem LATE).
   */
  forLateGeneration?: boolean;
};

/**
 * Devolve alunos com plano ativo que **não têm PAID** no mês de referência (YYYY-MM).
 */
export async function getRenewalsPending(
  supabase: SupabaseClient,
  referenceMonth: string,
  options?: GetRenewalsPendingOptions
): Promise<RenewalPending[]> {
  if (!/^\d{4}-\d{2}$/.test(referenceMonth)) return [];

  const { data: students } = await supabase
    .from("Student")
    .select("id, userId, planId, createdAt")
    .not("planId", "is", null);

  if (!students?.length) return [];

  const planIds = [...new Set(students.map((s) => s.planId).filter(Boolean))] as string[];
  const { data: plans } = await supabase
    .from("Plan")
    .select("id, name, priceMonthly")
    .in("id", planIds)
    .eq("isActive", true);

  const planById = new Map((plans ?? []).map((p) => [p.id, p]));

  const { data: payments } = await supabase
    .from("Payment")
    .select("studentId, status")
    .eq("referenceMonth", referenceMonth)
    .eq("paymentType", "TUITION");

  const paidStudentIds = new Set(
    (payments ?? []).filter((p) => (p as { status: string }).status === "PAID").map((p) => p.studentId)
  );
  const anyPaymentStudentIds = new Set((payments ?? []).map((p) => p.studentId));

  const candidateIds = students.filter((s) => s.planId && planById.has(s.planId)).map((s) => s.id);
  const { data: familyRows } = candidateIds.length
    ? await supabase
        .from("FamilyGroupMember")
        .select("studentId, role, familyGroupId")
        .in("studentId", candidateIds)
    : { data: [] as { studentId: string; role: string; familyGroupId: string }[] };
  const familyByStudent = new Map(
    (familyRows ?? []).map((f) => [f.studentId, f as { studentId: string; role: string; familyGroupId: string }])
  );

  const withPlan = students.filter((s) => {
    if (!s.planId || !planById.has(s.planId)) return false;
    const startMonth = tuitionStartMonthFromCreatedAt((s as { createdAt: string }).createdAt);
    if (isTuitionMonthBeforeEnrollment(referenceMonth, startMonth)) return false;
    if (paidStudentIds.has(s.id)) return false;
    if (options?.forLateGeneration && anyPaymentStudentIds.has(s.id)) return false;
    // Membros de família não têm cobrança individual — só o titular é cobrado.
    if (familyByStudent.get(s.id)?.role === "MEMBER") return false;
    return true;
  });
  if (withPlan.length === 0) return [];

  const userIds = [...new Set(withPlan.map((s) => s.userId))];
  const { data: users } = await supabase.from("User").select("id, name, email").in("id", userIds);
  const userById = new Map((users ?? []).map((u) => [u.id, u]));

  const result: RenewalPending[] = [];
  for (const s of withPlan) {
    const plan = planById.get(s.planId)!;
    const user = userById.get(s.userId);
    const family = familyByStudent.get(s.id);
    const priceMonthly = family
      ? await resolveFamilyGroupTitularSuggestedAmount(supabase, family.familyGroupId)
      : resolvePlanMonthlyTuition(plan.id, Number(plan.priceMonthly ?? 0));
    result.push({
      studentId: s.id,
      studentName: user?.name ?? user?.email ?? "—",
      studentEmail: user?.email ?? "",
      planId: plan.id,
      planName: plan.name,
      priceMonthly,
      familyGroupId: family?.familyGroupId ?? null,
    });
  }
  return result;
}

export type GenerateMonthlyPaymentsResult = {
  created: number;
  skipped: number;
  error?: string;
};

export type GenerateMonthlyPaymentsOptions = {
  /** Se true, ignora a regra do 5.º dia útil (ex.: ação de admin). */
  force?: boolean;
  /** Instante de referência (cron / testes). */
  now?: Date;
};

/**
 * Cria um registo de Payment (status LATE) para cada aluno com plano
 * sem PAID no mês de referência. Valor = plan.price_monthly.
 * Por defeito só corre após o fim do 5.º dia útil em Lisboa (ou mês já ultrapassado).
 */
export async function generateMonthlyPayments(
  supabase: SupabaseClient,
  referenceMonth: string,
  options?: GenerateMonthlyPaymentsOptions
): Promise<GenerateMonthlyPaymentsResult> {
  if (!/^\d{4}-\d{2}$/.test(referenceMonth)) {
    return { created: 0, skipped: 0, error: "Mês de referência deve ser AAAA-MM." };
  }

  const now = options?.now ?? new Date();
  const force = options?.force ?? false;
  if (!force && !shouldGenerateLatePayments(now, referenceMonth)) {
    return { created: 0, skipped: 0 };
  }

  const pending = await getRenewalsPending(supabase, referenceMonth, { forLateGeneration: true });
  let created = 0;

  for (const p of pending) {
    const { error } = await supabase.from("Payment").insert({
      id: crypto.randomUUID(),
      studentId: p.studentId,
      amount: p.priceMonthly,
      status: "LATE",
      referenceMonth,
      paymentType: "TUITION",
      familyGroupId: p.familyGroupId,
    });
    if (error) {
      return { created, skipped: pending.length - created, error: error.message };
    }
    await startGracePeriodOnLatePayment(supabase, p.studentId, referenceMonth);
    await syncStudentPaymentStatus(supabase, p.studentId);
    created++;
  }

  return { created, skipped: pending.length - created };
}
