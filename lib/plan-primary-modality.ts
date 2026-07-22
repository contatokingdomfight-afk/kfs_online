import { isFamilyPlan, KINGDOM_PLAN_PRESENCIAL_I_ID } from "@/lib/kingdom-plans-constants";

/**
 * `Plan.modalityScope === "SINGLE"` (ex.: Presencial I): o aluno escolhe uma modalidade.
 * `ALL` ou `NONE`: não se usa modalidade única (MMA, FULL, Básico).
 * Plano família é sempre tratado como `ALL`.
 */
export function effectiveModalityScope(
  modalityScope: string | null | undefined,
  planId?: string | null,
  planName?: string | null
): string {
  if (isFamilyPlan(planId, planName)) return "ALL";
  return modalityScope ?? "NONE";
}

export function planRequiresPrimaryModality(
  modalityScope: string | null | undefined,
  planId?: string | null,
  planName?: string | null
): boolean {
  if (planId === KINGDOM_PLAN_PRESENCIAL_I_ID) return true;
  return effectiveModalityScope(modalityScope, planId, planName) === "SINGLE";
}
