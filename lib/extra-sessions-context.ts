import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getPlanAccess } from "@/lib/plan-access";
import { getMonthlyCheckInLimit } from "@/lib/monthly-checkin-limit";
import {
  type DropInPricingContext,
  isKingdomWeekMonthlyCap,
} from "@/lib/drop-in-sessions-pricing";

/** Contexto para calcular preço de aulas avulsas/extra na ficha do aluno. */
export async function getDropInPricingContext(
  supabase: SupabaseClient,
  studentId: string,
  referenceMonth: string
): Promise<DropInPricingContext> {
  const planAccess = await getPlanAccess(supabase, studentId);
  const isKingdomWeekPlan = isKingdomWeekMonthlyCap(planAccess.maxCheckInsPerMonth);

  if (!isKingdomWeekPlan || planAccess.maxCheckInsPerMonth == null) {
    return { isKingdomWeekPlan: false, weekCapExhausted: false };
  }

  const monthly = await getMonthlyCheckInLimit(
    supabase,
    studentId,
    planAccess.maxCheckInsPerMonth,
    referenceMonth
  );

  return {
    isKingdomWeekPlan: true,
    weekCapExhausted: monthly.used >= planAccess.maxCheckInsPerMonth,
  };
}
