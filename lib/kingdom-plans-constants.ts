/** Id fixo em `supabase/migrations/20260414160000_seed_plans_legacy_kfs_snapshot.sql` */
export const KINGDOM_PLAN_PRESENCIAL_I_ID = "plan-presencial-i";

/** Plano família — gestão admin; não aparece em /escolher-plano */
export const KINGDOM_PLAN_FAMILIA_ID = "plan-familia";

/** Capacidade comercial por defeito (texto do catálogo; o grupo admin define `maxMembers`). */
export const KINGDOM_PLAN_FAMILIA_DEFAULT_MAX_MEMBERS = 4;

export const PLANS_EXCLUDED_FROM_SELF_SERVICE: readonly string[] = [KINGDOM_PLAN_FAMILIA_ID];

/** Plano família: acesso a todas as modalidades (equivalente ao Presencial MMA). */
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
