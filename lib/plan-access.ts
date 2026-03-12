/**
 * Permissões de acesso por plano.
 * Usar getPlanAccess(studentId) para obter o que o aluno pode fazer.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const MODALITIES_LIST = ["MUAY_THAI", "BOXING", "KICKBOXING"] as const;

export type PlanAccess = {
  hasDigitalAccess: boolean;
  hasPerformanceTracking: boolean;
  hasCheckIn: boolean;
  maxCheckInsPerDay: 0 | 1 | null; // null = ilimitado
  hasExclusiveBenefits: boolean;
  allowedModalities: string[];
  primaryModality: string | null;
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
  };

  if (!studentId) return defaultAccess;

  const { data: student } = await supabase
    .from("Student")
    .select("planId, primaryModality")
    .eq("id", studentId)
    .single();

  if (!student?.planId) return defaultAccess;

  const { data: plan } = await supabase
    .from("Plan")
    .select(
      "modality_scope, includes_digital_access, includes_performance_tracking, includes_check_in, max_check_ins_per_day, includes_exclusive_benefits"
    )
    .eq("id", student.planId)
    .eq("is_active", true)
    .single();

  if (!plan) return defaultAccess;

  const modalityScope = (plan.modality_scope as string) ?? "NONE";
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

  return {
    hasDigitalAccess: plan.includes_digital_access === true,
    hasPerformanceTracking: (plan.includes_performance_tracking ?? true) === true,
    hasCheckIn: (plan.includes_check_in ?? true) === true,
    maxCheckInsPerDay,
    hasExclusiveBenefits: plan.includes_exclusive_benefits === true,
    allowedModalities,
    primaryModality,
  };
}
