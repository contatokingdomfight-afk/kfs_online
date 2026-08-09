/**
 * Cálculo da mensalidade do plano família: cobrança única no titular.
 * Base = soma do preço do "plano de referência" de cada membro (o plano que a
 * pessoa pagaria a título individual — ex.: um filho referencia o Kingdom Kids,
 * o adulto que pratica referencia o Kingdom Elite). Desconto % do grupo aplica-se
 * sobre essa soma. Membro sem plano de referência definido usa o fallback
 * KINGDOM_PLAN_FAMILIA_MONTHLY_PER_PERSON (80€) só no cálculo da mensalidade
 * (o acesso vem do plano de referência — ver `lib/family-effective-plan.ts`).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  KINGDOM_PLAN_FAMILIA_MONTHLY_PER_PERSON,
  isFamilyPlan,
} from "@/lib/kingdom-plans-constants";
import { getFamilyContext, type FamilyGroupRole } from "@/lib/family-context";
import { currentReferenceMonthLisbon } from "@/lib/lisbon-payment-dates";

/** Valor mensal por pessoa no plano família (fallback quando não há plano de referência). */
export function familyMonthlyTuitionPerPerson(): number {
  return KINGDOM_PLAN_FAMILIA_MONTHLY_PER_PERSON;
}

/** Mensalidade efectiva para alunos fora do plano família: preço do plano normal. */
export function resolvePlanMonthlyTuition(
  planId: string | null | undefined,
  planPriceMonthly: number | null | undefined
): number {
  return Number(planPriceMonthly ?? 0);
}

/** Associa a mensalidade ao grupo quando o aluno pertence a um. */
export function familyGroupIdForTuition(ctx: { group: { id: string } } | null | undefined): string | null {
  return ctx?.group.id ?? null;
}

export type FamilyMemberPriceInfo = {
  studentId: string;
  role: FamilyGroupRole;
  referencePlanId: string | null;
  referencePlanName: string | null;
  referencePrice: number;
  usedFallback: boolean;
};

export type FamilyPricingBreakdown = {
  groupId: string;
  members: FamilyMemberPriceInfo[];
  baseTotal: number;
  discountPercent: number;
  discountAmount: number;
  finalMonthlyAmount: number;
  membersMissingReferencePlan: string[];
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Parte pura do cálculo: soma dos preços de referência + desconto do grupo. */
export function computeFamilyPricingFromMembers(
  members: FamilyMemberPriceInfo[],
  discountPercent: number
): Omit<FamilyPricingBreakdown, "groupId"> {
  const membersMissingReferencePlan = members.filter((m) => m.usedFallback).map((m) => m.studentId);
  const baseTotal = round2(members.reduce((sum, m) => sum + m.referencePrice, 0));
  const discountAmount = round2(baseTotal * (discountPercent / 100));
  const finalMonthlyAmount = round2(baseTotal - discountAmount);

  return {
    members,
    baseTotal,
    discountPercent,
    discountAmount,
    finalMonthlyAmount,
    membersMissingReferencePlan,
  };
}

/** Soma dos preços de referência dos membros do grupo, com desconto do grupo aplicado. */
export async function computeFamilyGroupMonthlyTuition(
  supabase: SupabaseClient,
  groupId: string
): Promise<FamilyPricingBreakdown | { error: string }> {
  const { data: group } = await supabase
    .from("FamilyGroup")
    .select("id, discountPercent")
    .eq("id", groupId)
    .maybeSingle();
  if (!group) return { error: "Grupo familiar não encontrado." };

  const { data: memberRows } = await supabase
    .from("FamilyGroupMember")
    .select("studentId, role, referencePlanId")
    .eq("familyGroupId", groupId);

  const members = (memberRows ?? []) as {
    studentId: string;
    role: FamilyGroupRole;
    referencePlanId: string | null;
  }[];

  const planIds = [...new Set(members.map((m) => m.referencePlanId).filter(Boolean))] as string[];
  const { data: plans } = planIds.length
    ? await supabase.from("Plan").select("id, name, priceMonthly").in("id", planIds)
    : { data: [] as { id: string; name: string; priceMonthly: number }[] };
  const planById = new Map((plans ?? []).map((p) => [p.id, p]));

  const fallback = KINGDOM_PLAN_FAMILIA_MONTHLY_PER_PERSON;
  const memberInfos: FamilyMemberPriceInfo[] = members.map((m) => {
    const plan = m.referencePlanId ? planById.get(m.referencePlanId) : undefined;
    return {
      studentId: m.studentId,
      role: m.role,
      referencePlanId: m.referencePlanId,
      referencePlanName: plan?.name ?? null,
      referencePrice: plan ? Number(plan.priceMonthly ?? 0) : fallback,
      usedFallback: !plan,
    };
  });

  const discountPercent = Number((group as { discountPercent?: number }).discountPercent ?? 0);
  return { groupId, ...computeFamilyPricingFromMembers(memberInfos, discountPercent) };
}

/** Atalho: só o valor final sugerido para o pagamento do titular. */
export async function resolveFamilyGroupTitularSuggestedAmount(
  supabase: SupabaseClient,
  groupId: string
): Promise<number> {
  const result = await computeFamilyGroupMonthlyTuition(supabase, groupId);
  if ("error" in result) return 0;
  return result.finalMonthlyAmount;
}

/** Planos individuais activos elegíveis como "plano de referência" de um membro (exclui o próprio plano família). */
export async function listFamilyReferencePlanOptions(
  supabase: SupabaseClient,
  schoolId: string
): Promise<Array<{ id: string; name: string; priceMonthly: number }>> {
  const { data: plans } = await supabase
    .from("Plan")
    .select("id, name, priceMonthly")
    .eq("schoolId", schoolId)
    .eq("isActive", true)
    .order("priceMonthly", { ascending: true });

  return (plans ?? [])
    .filter((p) => !isFamilyPlan((p as { id: string }).id, (p as { name?: string }).name))
    .map((p) => ({
      id: (p as { id: string }).id,
      name: (p as { name: string }).name,
      priceMonthly: Number((p as { priceMonthly: number }).priceMonthly ?? 0),
    }));
}

/**
 * Recalcula e actualiza (só) a(s) mensalidade(s) LATE pendente(s)/futuras do titular
 * com o valor actual da fórmula. Nunca toca em linhas PAID (histórico intacto).
 */
export async function refreshFamilyTitularPendingTuition(
  supabase: SupabaseClient,
  groupId: string
): Promise<{ error?: string; updated: boolean }> {
  const { data: group } = await supabase
    .from("FamilyGroup")
    .select("billingStudentId")
    .eq("id", groupId)
    .maybeSingle();
  if (!group?.billingStudentId) return { error: "Grupo familiar não encontrado.", updated: false };

  const amount = await resolveFamilyGroupTitularSuggestedAmount(supabase, groupId);
  const currentMonth = currentReferenceMonthLisbon(new Date());

  const { data: rows, error } = await supabase
    .from("Payment")
    .update({ amount })
    .eq("studentId", group.billingStudentId)
    .eq("paymentType", "TUITION")
    .eq("status", "LATE")
    .gte("referenceMonth", currentMonth)
    .select("id");

  if (error) return { error: error.message, updated: false };
  return { updated: (rows?.length ?? 0) > 0 };
}
