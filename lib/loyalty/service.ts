import type { SupabaseClient } from "@supabase/supabase-js";
import { currentReferenceMonthLisbon } from "@/lib/lisbon-payment-dates";
import { addMonthsToReferenceMonth } from "@/lib/reference-month";

/**
 * Fidelização: o aluno (ou o titular do grupo familiar) compromete-se 6 meses e cada mensalidade
 * tem o desconto do plano (Plan.loyaltyMonthlyDiscount). Renova sozinha por mais 6 meses.
 * Sair antes do fim: paga o desconto já recebido (cobrança LOYALTY_EXIT).
 * Todas as leituras toleram a migração ainda não aplicada (devolvem «sem fidelização»).
 */

export const LOYALTY_MONTHS = 6;

export type LoyaltyCommitment = {
  id: string;
  studentId: string;
  months: number;
  startMonth: string;
  endMonth: string;
  renewals: number;
  autoRenew: boolean;
  state: "ACTIVE" | "ENDED";
  exitPenaltyAmount: number | null;
  endedAt: string | null;
  createdAt: string;
};

const COLUMNS = "id, studentId, months, startMonth, endMonth, renewals, autoRenew, state, exitPenaltyAmount, endedAt, createdAt";

function normalize(r: Record<string, unknown>): LoyaltyCommitment {
  return { ...(r as LoyaltyCommitment), months: Number(r.months ?? LOYALTY_MONTHS), renewals: Number(r.renewals ?? 0), exitPenaltyAmount: r.exitPenaltyAmount == null ? null : Number(r.exitPenaltyAmount) };
}

/** Desconto de fidelização por plano (0 quando o plano não tem fidelização ou a coluna ainda não existe). */
export async function loadPlanLoyaltyDiscounts(supabase: SupabaseClient, planIds: string[]): Promise<Map<string, number>> {
  const ids = [...new Set(planIds.filter(Boolean))];
  if (!ids.length) return new Map();
  const { data, error } = await supabase.from("Plan").select("id, loyaltyMonthlyDiscount").in("id", ids);
  if (error) return new Map();
  return new Map(((data ?? []) as { id: string; loyaltyMonthlyDiscount: number | string | null }[]).map((p) => [p.id, Math.max(0, Number(p.loyaltyMonthlyDiscount ?? 0))]));
}

/** Fidelização ativa do pagador; prolonga-a (renovação automática) se o período já tiver acabado. */
export async function loadActiveLoyalty(supabase: SupabaseClient, studentId: string): Promise<LoyaltyCommitment | null> {
  const { data, error } = await supabase.from("LoyaltyCommitment").select(COLUMNS).eq("studentId", studentId).eq("state", "ACTIVE").order("createdAt", { ascending: false }).limit(1);
  if (error || !data?.length) return null;
  const c = normalize(data[0] as Record<string, unknown>);
  const current = currentReferenceMonthLisbon(new Date());
  if (c.autoRenew && c.endMonth < current) {
    let end = c.endMonth;
    let renewals = c.renewals;
    while (end < current) {
      end = addMonthsToReferenceMonth(end, c.months);
      renewals++;
    }
    await supabase.from("LoyaltyCommitment").update({ endMonth: end, renewals, updatedAt: new Date().toISOString() }).eq("id", c.id);
    return { ...c, endMonth: end, renewals };
  }
  return c;
}

/** A fidelização cobre esse mês? (com renovação automática, cobre todos os meses a partir do início). */
export function loyaltyCoversMonth(c: LoyaltyCommitment | null, month: string): boolean {
  if (!c || c.state !== "ACTIVE") return false;
  if (month < c.startMonth) return false;
  return c.autoRenew || month <= c.endMonth;
}

/** Desconto de fidelização de um aluno individual nesse mês (0 se não estiver fidelizado). */
export async function individualLoyaltyDiscount(supabase: SupabaseClient, studentId: string, planId: string | null, month: string): Promise<number> {
  if (!planId) return 0;
  const c = await loadActiveLoyalty(supabase, studentId);
  if (!loyaltyCoversMonth(c, month)) return 0;
  return (await loadPlanLoyaltyDiscounts(supabase, [planId])).get(planId) ?? 0;
}

/** Plano(s) que contam para o desconto do pagador: o plano do aluno, ou os planos de referência dos membros do grupo. */
async function payerPlanIds(supabase: SupabaseClient, payerStudentId: string, familyGroupId: string | null): Promise<string[]> {
  if (familyGroupId) {
    const { data } = await supabase.from("FamilyGroupMember").select("referencePlanId").eq("familyGroupId", familyGroupId);
    return ((data ?? []) as { referencePlanId: string | null }[]).map((m) => m.referencePlanId).filter((x): x is string => !!x);
  }
  const { data } = await supabase.from("Student").select("planId").eq("id", payerStudentId).maybeSingle();
  const planId = (data as { planId?: string | null } | null)?.planId;
  return planId ? [planId] : [];
}

/** Desconto mensal total que o pagador teria com fidelização (soma dos membros, no caso de família). */
export async function payerLoyaltyMonthlyDiscount(supabase: SupabaseClient, payerStudentId: string, familyGroupId: string | null): Promise<number> {
  const planIds = await payerPlanIds(supabase, payerStudentId, familyGroupId);
  const discounts = await loadPlanLoyaltyDiscounts(supabase, planIds);
  return planIds.reduce((t, id) => t + (discounts.get(id) ?? 0), 0);
}

/** Começa uma fidelização de 6 meses a partir do próximo mês. */
export async function startLoyalty(
  supabase: SupabaseClient,
  input: { payerStudentId: string; familyGroupId: string | null; createdByUserId: string | null; startMonth?: string }
): Promise<{ commitment?: LoyaltyCommitment; error?: string }> {
  const existing = await loadActiveLoyalty(supabase, input.payerStudentId);
  if (existing) return { error: "Já tens a fidelização ativa." };
  const discount = await payerLoyaltyMonthlyDiscount(supabase, input.payerStudentId, input.familyGroupId);
  if (!(discount > 0)) return { error: "O teu plano não tem fidelização disponível." };

  const startMonth = input.startMonth ?? addMonthsToReferenceMonth(currentReferenceMonthLisbon(new Date()), 1);
  const now = new Date().toISOString();
  const row = {
    id: crypto.randomUUID(),
    studentId: input.payerStudentId,
    months: LOYALTY_MONTHS,
    startMonth,
    endMonth: addMonthsToReferenceMonth(startMonth, LOYALTY_MONTHS - 1),
    renewals: 0,
    autoRenew: true,
    state: "ACTIVE",
    createdByUserId: input.createdByUserId,
    createdAt: now,
    updatedAt: now,
  };
  const { error } = await supabase.from("LoyaltyCommitment").insert(row);
  if (error) return { error: "Não foi possível guardar a fidelização." };
  return { commitment: normalize(row as unknown as Record<string, unknown>) };
}

/** Valor a devolver ao sair antes do fim: desconto × mensalidades já cobradas com desconto neste período. */
export async function loyaltyExitPenalty(
  supabase: SupabaseClient,
  c: LoyaltyCommitment,
  familyGroupId: string | null
): Promise<{ months: number; monthlyDiscount: number; amount: number }> {
  const monthlyDiscount = await payerLoyaltyMonthlyDiscount(supabase, c.studentId, familyGroupId);
  const current = currentReferenceMonthLisbon(new Date());
  // Só o período atual (6 meses); uma renovação já cumprida não conta.
  const periodStart = c.renewals > 0 ? addMonthsToReferenceMonth(c.endMonth, -(c.months - 1)) : c.startMonth;
  const upTo = current < c.endMonth ? current : c.endMonth;
  if (upTo < periodStart) return { months: 0, monthlyDiscount, amount: 0 };
  const { data } = await supabase
    .from("Payment")
    .select("referenceMonth")
    .eq("studentId", c.studentId)
    .eq("paymentType", "TUITION")
    .gte("referenceMonth", periodStart)
    .lte("referenceMonth", upTo);
  const months = new Set(((data ?? []) as { referenceMonth: string }[]).map((p) => p.referenceMonth)).size;
  return { months, monthlyDiscount, amount: Math.round(months * monthlyDiscount * 100) / 100 };
}

/** Termina a fidelização. Com `chargePenalty`, cria a cobrança «Saída da fidelização» com o desconto recebido. */
export async function endLoyalty(
  supabase: SupabaseClient,
  c: LoyaltyCommitment,
  opts: { familyGroupId: string | null; chargePenalty: boolean }
): Promise<{ error?: string; penalty?: number }> {
  const now = new Date().toISOString();
  let penalty = 0;
  let exitPaymentId: string | null = null;
  if (opts.chargePenalty) {
    penalty = (await loyaltyExitPenalty(supabase, c, opts.familyGroupId)).amount;
    if (penalty > 0) {
      exitPaymentId = crypto.randomUUID();
      const { error } = await supabase.from("Payment").insert({
        id: exitPaymentId,
        studentId: c.studentId,
        amount: penalty,
        status: "LATE",
        paymentType: "LOYALTY_EXIT",
        referenceMonth: currentReferenceMonthLisbon(new Date()),
        familyGroupId: opts.familyGroupId,
      });
      if (error) return { error: "Não foi possível criar a cobrança de saída." };
    }
  }
  await supabase
    .from("LoyaltyCommitment")
    .update({ state: "ENDED", endedAt: now, exitPenaltyAmount: opts.chargePenalty ? penalty : null, exitPaymentId, autoRenew: false, updatedAt: now })
    .eq("id", c.id);
  return { penalty };
}

/** Todas as fidelizações ativas (para cálculos em lote, ex.: geração das mensalidades do mês). */
export async function loadActiveLoyaltyIndex(supabase: SupabaseClient): Promise<Map<string, LoyaltyCommitment>> {
  const { data, error } = await supabase.from("LoyaltyCommitment").select(COLUMNS).eq("state", "ACTIVE");
  if (error) return new Map();
  return new Map(((data ?? []) as Record<string, unknown>[]).map(normalize).map((c) => [c.studentId, c]));
}
