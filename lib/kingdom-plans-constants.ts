/** Id fixo em `supabase/migrations/20260414160000_seed_plans_legacy_kfs_snapshot.sql` */
export const KINGDOM_PLAN_PRESENCIAL_I_ID = "plan-presencial-i";

/** Plano família — gestão admin; não aparece em /escolher-plano */
export const KINGDOM_PLAN_FAMILIA_ID = "plan-familia";

export const PLANS_EXCLUDED_FROM_SELF_SERVICE: readonly string[] = [KINGDOM_PLAN_FAMILIA_ID];
