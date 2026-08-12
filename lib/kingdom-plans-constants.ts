/** Id fixo em `supabase/migrations/20260414160000_seed_plans_legacy_kfs_snapshot.sql` */
export const KINGDOM_PLAN_PRESENCIAL_I_ID = "plan-presencial-i";

/** Plano família — gestão admin; não aparece em /escolher-plano */
export const KINGDOM_PLAN_FAMILIA_ID = "plan-familia";

/** Mínimo comercial de pessoas no grupo familiar (sem limite máximo). */
export const KINGDOM_PLAN_FAMILIA_MIN_MEMBERS = 2;

/** Mensalidade por pessoa no grupo familiar (desconto face ao FULL ~100 €). */
export const KINGDOM_PLAN_FAMILIA_MONTHLY_PER_PERSON = 80;

export const PLANS_EXCLUDED_FROM_SELF_SERVICE: readonly string[] = [KINGDOM_PLAN_FAMILIA_ID];

/**
 * Plano família: agrupamento para desconto na mensalidade. A modalidade de cada membro
 * vem do plano de referência que a secretaria escolheu para essa pessoa; biblioteca,
 * performance e check-in vêm sempre do próprio plano família (ver `getPlanAccess`).
 */
export function isFamilyPlan(planId?: string | null, name?: string | null): boolean {
  if (planId === KINGDOM_PLAN_FAMILIA_ID) return true;
  const n = (name ?? "").toLowerCase();
  return n.includes("famil");
}

/** Planos que não podem ser escolhidos em /escolher-plano (gestão na secretaria). */
export function isPlanExcludedFromSelfService(planId?: string | null, name?: string | null): boolean {
  if (!planId) return false;
  if (PLANS_EXCLUDED_FROM_SELF_SERVICE.includes(planId)) return true;
  return isFamilyPlan(planId, name);
}
