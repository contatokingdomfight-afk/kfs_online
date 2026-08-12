/**
 * Permissões de acesso por plano.
 * Usar getPlanAccess(supabase, studentId) em rotas que já têm cliente;
 * em layouts/páginas RSC preferir getCachedPlanAccess(studentId) para deduplicar no mesmo pedido.
 */

import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

import { KINGDOM_PLAN_PRESENCIAL_I_ID, isFamilyPlan } from "./kingdom-plans-constants";
import { resolveEffectiveAccessPlanId } from "./family-effective-plan";

const MODALITIES_LIST = ["MUAY_THAI", "BOXING", "KICKBOXING", "MMA"] as const;

export type PlanAccess = {
  hasDigitalAccess: boolean;
  hasPerformanceTracking: boolean;
  hasCheckIn: boolean;
  maxCheckInsPerDay: 0 | 1 | null; // null = ilimitado
  hasExclusiveBenefits: boolean;
  allowedModalities: string[];
  primaryModality: string | null;
  /** `Student.planId` (plano de subscrição/base). */
  currentPlanId: string | null;
  /** Só com Kingdom Presencial I, sem o add-on da biblioteca ainda ativo. */
  canSubscribeDigitalLibraryAddon: boolean;
};

/**
 * Retorna as permissões de acesso do aluno com base no seu plano.
 * Se não tiver plano ou plano inativo: sem performance, sem check-in, sem digital.
 */
export async function getPlanAccess(
  supabase: SupabaseClient,
  studentId: string | null
): Promise<PlanAccess> {
  const defaultAccess: PlanAccess = {
    hasDigitalAccess: false,
    hasPerformanceTracking: false,
    hasCheckIn: false,
    maxCheckInsPerDay: 0,
    hasExclusiveBenefits: false,
    allowedModalities: [],
    primaryModality: null,
    currentPlanId: null,
    canSubscribeDigitalLibraryAddon: false,
  };

  if (!studentId) return defaultAccess;

  const { data: student } = await supabase
    .from("Student")
    .select("planId, primaryModality, digitalLibraryAddon")
    .eq("id", studentId)
    .single();

  if (!student?.planId) return defaultAccess;

  const subscriptionPlanId = student.planId as string;
  const isFamily = isFamilyPlan(subscriptionPlanId);

  const { data: plan } = await supabase
    .from("Plan")
    .select(
      "id, modalityScope, includesDigitalAccess, includes_performance_tracking, includes_check_in, max_check_ins_per_day, includes_exclusive_benefits"
    )
    .eq("id", subscriptionPlanId)
    .eq("isActive", true)
    .single();

  if (!plan) return defaultAccess;

  /**
   * No plano família, a modalidade vem do plano de referência que a secretaria escolheu
   * para cada membro (ex.: 80€ = todas, 55€ = só uma) — mas biblioteca, performance e
   * check-in vêm do próprio plano família (`plan`, já carregado acima), porque o plano de
   * referência serve só para calcular a modalidade/mensalidade do grupo, não para limitar
   * o resto do acesso.
   */
  let modalityScope = (plan.modalityScope as string) ?? "NONE";
  if (isFamily) {
    const referencePlanId = await resolveEffectiveAccessPlanId(supabase, studentId, subscriptionPlanId);
    if (referencePlanId) {
      const { data: referencePlan } = await supabase
        .from("Plan")
        .select("modalityScope")
        .eq("id", referencePlanId)
        .eq("isActive", true)
        .single();
      modalityScope = (referencePlan?.modalityScope as string) ?? "NONE";
    } else {
      modalityScope = "NONE";
    }
  }
  const primaryModality = (student.primaryModality as string | null) ?? null;

  let allowedModalities: string[] = [];
  if (modalityScope === "NONE") {
    allowedModalities = [];
  } else if (modalityScope === "SINGLE" && primaryModality) {
    allowedModalities = [primaryModality];
  } else {
    allowedModalities = [...MODALITIES_LIST];
  }

  const maxCheckIns = plan.max_check_ins_per_day;
  const maxCheckInsPerDay: 0 | 1 | null =
    maxCheckIns === null ? null : maxCheckIns === 1 ? 1 : 0;

  const planRowId = (plan as { id: string }).id;
  const baseDigital = plan.includesDigitalAccess === true;
  const addon = (student as { digitalLibraryAddon?: boolean | null }).digitalLibraryAddon === true;
  const hasDigitalAccess =
    baseDigital || (planRowId === KINGDOM_PLAN_PRESENCIAL_I_ID && addon);
  // Só oferece o add-on a quem ainda não tem biblioteca incluída no próprio plano
  // (o Kingdom Presencial I passou a incluir `includesDigitalAccess` por omissão).
  const canSubscribeDigitalLibraryAddon =
    planRowId === KINGDOM_PLAN_PRESENCIAL_I_ID && !addon && !baseDigital;

  return {
    hasDigitalAccess,
    hasPerformanceTracking: (plan.includes_performance_tracking ?? true) === true,
    hasCheckIn: (plan.includes_check_in ?? true) === true,
    maxCheckInsPerDay,
    hasExclusiveBenefits: plan.includes_exclusive_benefits === true,
    allowedModalities,
    primaryModality,
    currentPlanId: student.planId,
    canSubscribeDigitalLibraryAddon,
  };
}

/** Mesmo resultado que getPlanAccess, mas memoizado por pedido (studentId). */
export const getCachedPlanAccess = cache(async (studentId: string | null) => {
  const supabase = await createClient();
  return getPlanAccess(supabase, studentId);
});

/** Re-export: páginas que importam `getCachedPlanAccess` usam a mesma linha e evitam omitir `getCachedLocations` no build. */
export { getCachedLocations } from "./cached-reference-data";
