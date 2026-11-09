/**
 * Renovação automática de planos: alunos com plano e mensalidades por mês.
 * - Listar alunos com plano que ainda não têm pagamento no mês de referência.
 * - Gerar registos de Payment (mensalidades) para o mês com status LATE.
 */

import { filterSchools } from "@/lib/school-scope-rules";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  shouldGenerateLatePayments,
  currentReferenceMonthLisbon,
  normalizeDueDay,
} from "@/lib/lisbon-payment-dates";
import { startGracePeriodOnLatePayment } from "@/lib/payment-grace";
import { syncStudentPaymentStatus } from "@/lib/student-payment-status";
import { resolvePlanMonthlyTuition, resolveFamilyGroupTitularSuggestedAmount } from "@/lib/family-tuition";
import { loadActiveLoyaltyIndex, loadPlanLoyaltyDiscounts, loyaltyCoversMonth, individualLoyaltyDiscount } from "@/lib/loyalty/service";
import { tuitionStartMonthFromCreatedAt, isTuitionMonthBeforeEnrollment } from "@/lib/student-tuition-start";
import { loadPausesByStudent, monthExemptByPauses } from "@/lib/tuition-pause";

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
  /** Escopo multi-escola (listagens do admin): null/omisso = todas. */
  schoolIds?: string[] | null;
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

  const { data: students } = await filterSchools(supabase
    .from("Student")
    .select("id, userId, planId, createdAt, paymentDueDay"), options?.schoolIds)
    .not("planId", "is", null)
    // Alunos inativos não geram mensalidade (nem aparecem como a renovar).
    .neq("status", "INATIVO");

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
  // Grupos desactivados deixam de contar: cada pessoa é cobrada pelo seu próprio plano.
  const familyGroupIds = [...new Set((familyRows ?? []).map((f) => f.familyGroupId))];
  const { data: activeGroups } = familyGroupIds.length
    ? await supabase.from("FamilyGroup").select("id").in("id", familyGroupIds).eq("isActive", true)
    : { data: [] as { id: string }[] };
  const activeGroupIds = new Set((activeGroups ?? []).map((g) => g.id));
  const familyByStudent = new Map(
    (familyRows ?? [])
      .filter((f) => activeGroupIds.has(f.familyGroupId))
      .map((f) => [f.studentId, f as { studentId: string; role: string; familyGroupId: string }])
  );
  // Pausas (ex.: atestado médico): meses isentos não geram mensalidade nem aparecem a renovar.
  const pausesByStudent = await loadPausesByStudent(supabase, candidateIds);

  const withPlan = students.filter((s) => {
    if (!s.planId || !planById.has(s.planId)) return false;
    const startMonth = tuitionStartMonthFromCreatedAt((s as { createdAt: string }).createdAt);
    if (isTuitionMonthBeforeEnrollment(referenceMonth, startMonth)) return false;
    if (paidStudentIds.has(s.id)) return false;
    const pauses = pausesByStudent.get(s.id);
    if (pauses && monthExemptByPauses(pauses, referenceMonth, normalizeDueDay((s as { paymentDueDay?: number }).paymentDueDay))) return false;
    if (options?.forLateGeneration && anyPaymentStudentIds.has(s.id)) return false;
    // Membros de família não têm cobrança individual — só o titular é cobrado.
    if (familyByStudent.get(s.id)?.role === "MEMBER") return false;
    return true;
  });
  if (withPlan.length === 0) return [];

  const userIds = [...new Set(withPlan.map((s) => s.userId))];
  const { data: users } = await supabase.from("User").select("id, name, email").in("id", userIds);
  const userById = new Map((users ?? []).map((u) => [u.id, u]));

  // Fidelização: desconto do plano nas mensalidades dos alunos fidelizados (família: aplicado no total do grupo).
  const [loyalty, loyaltyDiscount] = await Promise.all([loadActiveLoyaltyIndex(supabase), loadPlanLoyaltyDiscounts(supabase, planIds)]);

  const result: RenewalPending[] = [];
  for (const s of withPlan) {
    const plan = planById.get(s.planId)!;
    const user = userById.get(s.userId);
    const family = familyByStudent.get(s.id);
    const priceMonthly = family
      ? await resolveFamilyGroupTitularSuggestedAmount(supabase, family.familyGroupId, referenceMonth)
      : Math.max(
          0,
          resolvePlanMonthlyTuition(plan.id, Number(plan.priceMonthly ?? 0)) -
            (loyaltyCoversMonth(loyalty.get(s.id) ?? null, referenceMonth) ? loyaltyDiscount.get(plan.id) ?? 0 : 0)
        );
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
  /** Se true, gera mesmo antes do início do mês de referência (ex.: ação de admin). */
  force?: boolean;
  /** Instante de referência (cron / testes). */
  now?: Date;
};

/**
 * Cria um registo de Payment (status LATE) para cada aluno com plano
 * sem PAID no mês de referência. Valor = plan.price_monthly.
 * Por defeito gera a partir do dia 1 do mês; o atraso conta-se pelo dia de pagamento de cada aluno.
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
    const paymentId = crypto.randomUUID();
    const finalAmount = await applyUnconsumedReferralCredits(supabase, p.studentId, p.priceMonthly, paymentId);
    const { error } = await supabase.from("Payment").insert({
      id: paymentId,
      studentId: p.studentId,
      amount: finalAmount,
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

/**
 * Aplica os créditos de indicação por consumir de um aluno ao valor da mensalidade, reduzindo-o
 * (nunca abaixo de 0) e marcando os créditos usados como consumidos neste pagamento. Créditos que
 * excedam o valor da mensalidade ficam por consumir (aplicam-se no mês seguinte).
 */
async function applyUnconsumedReferralCredits(
  supabase: SupabaseClient,
  studentId: string,
  amount: number,
  paymentId: string
): Promise<number> {
  const { data: credits } = await supabase
    .from("ReferralCredit")
    .select("id, amount")
    .eq("studentId", studentId)
    .is("consumedAt", null)
    .order("created_at", { ascending: true });
  if (!credits?.length) return amount;

  let remaining = amount;
  const consumedIds: string[] = [];
  for (const c of credits) {
    if (remaining <= 0) break;
    const creditAmount = Number((c as { amount: number | string }).amount);
    if (!Number.isFinite(creditAmount) || creditAmount <= 0) continue;
    remaining = Math.max(0, Math.round((remaining - creditAmount) * 100) / 100);
    consumedIds.push((c as { id: string }).id);
  }
  if (consumedIds.length > 0) {
    await supabase
      .from("ReferralCredit")
      .update({ consumedAt: new Date().toISOString(), consumedPaymentId: paymentId })
      .in("id", consumedIds);
  }
  return remaining;
}

/**
 * Ao mudar o plano de um aluno individual, ajusta as mensalidades ainda em aberto (LATE)
 * do mês corrente em diante à diferença de preço entre planos (mantém créditos de
 * indicação/descontos já aplicados). Meses anteriores ficam com o valor do plano antigo.
 */
export async function repriceOpenTuitionOnPlanChange(
  supabase: SupabaseClient,
  studentId: string,
  oldPlanId: string | null,
  newPlanId: string | null,
  now: Date = new Date()
): Promise<{ updated: number; error?: string }> {
  if (!oldPlanId || !newPlanId || oldPlanId === newPlanId) return { updated: 0 };

  const { data: open } = await supabase
    .from("Payment")
    .select("id, amount, referenceMonth")
    .eq("studentId", studentId)
    .eq("status", "LATE")
    .eq("paymentType", "TUITION")
    .is("familyGroupId", null)
    .gte("referenceMonth", currentReferenceMonthLisbon(now));
  if (!open?.length) return { updated: 0 };

  const { data: plans } = await supabase.from("Plan").select("id, priceMonthly").in("id", [oldPlanId, newPlanId]);
  const priceOf = new Map((plans ?? []).map((p) => [p.id as string, resolvePlanMonthlyTuition(p.id as string, Number(p.priceMonthly ?? 0))]));
  if (!priceOf.has(oldPlanId) || !priceOf.has(newPlanId)) return { updated: 0 };

  let updated = 0;
  for (const p of open as { id: string; amount: number | string; referenceMonth: string }[]) {
    const [oldDisc, newDisc] = await Promise.all([
      individualLoyaltyDiscount(supabase, studentId, oldPlanId, p.referenceMonth),
      individualLoyaltyDiscount(supabase, studentId, newPlanId, p.referenceMonth),
    ]);
    const oldExpected = Math.max(0, priceOf.get(oldPlanId)! - oldDisc);
    const newExpected = Math.max(0, priceOf.get(newPlanId)! - newDisc);
    const amount = Math.max(0, Number(p.amount) + newExpected - oldExpected);
    if (amount === Number(p.amount)) continue;
    const { error } = await supabase.from("Payment").update({ amount: amount.toFixed(2) }).eq("id", p.id).eq("status", "LATE");
    if (error) return { updated, error: error.message };
    updated++;
  }
  return { updated };
}
