import {
  KINGDOM_PLAN_FAMILIA_MONTHLY_PER_PERSON,
  isFamilyPlan,
} from "@/lib/kingdom-plans-constants";
import type { FamilyContext } from "@/lib/family-group";

/** Valor mensal por pessoa no plano família. */
export function familyMonthlyTuitionPerPerson(): number {
  return KINGDOM_PLAN_FAMILIA_MONTHLY_PER_PERSON;
}

/** Mensalidade efectiva: 80 € no grupo familiar; caso contrário preço do plano. */
export function resolvePlanMonthlyTuition(
  planId: string | null | undefined,
  planPriceMonthly: number | null | undefined,
  inFamilyGroup: boolean
): number {
  if (inFamilyGroup || isFamilyPlan(planId)) {
    return KINGDOM_PLAN_FAMILIA_MONTHLY_PER_PERSON;
  }
  return Number(planPriceMonthly ?? 0);
}

/** Associa a mensalidade ao grupo quando o aluno pertence a um. */
export function familyGroupIdForTuition(ctx: FamilyContext | null | undefined): string | null {
  return ctx?.group.id ?? null;
}
