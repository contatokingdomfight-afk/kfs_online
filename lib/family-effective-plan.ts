import type { SupabaseClient } from "@supabase/supabase-js";
import { isFamilyPlan } from "@/lib/kingdom-plans-constants";

/**
 * No plano família, o acesso (modalidades, digital, check-in) vem do plano de referência
 * individual de cada membro — `plan-familia` é só agrupamento/desconto na mensalidade.
 */
export async function resolveEffectiveAccessPlanId(
  supabase: SupabaseClient,
  studentId: string,
  subscriptionPlanId: string | null
): Promise<string | null> {
  if (!subscriptionPlanId) return null;
  if (!isFamilyPlan(subscriptionPlanId)) return subscriptionPlanId;

  const { data: member } = await supabase
    .from("FamilyGroupMember")
    .select("referencePlanId")
    .eq("studentId", studentId)
    .maybeSingle();

  return (member as { referencePlanId?: string | null } | null)?.referencePlanId ?? null;
}

/** Mapa studentId → referencePlanId para alunos no plano família (batch). */
export async function loadFamilyReferencePlanIdByStudent(
  supabase: SupabaseClient,
  studentIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (studentIds.length === 0) return map;

  const { data } = await supabase
    .from("FamilyGroupMember")
    .select("studentId, referencePlanId")
    .in("studentId", studentIds);

  for (const row of data ?? []) {
    const ref = (row as { referencePlanId?: string | null }).referencePlanId;
    if (ref) map.set((row as { studentId: string }).studentId, ref);
  }
  return map;
}

export type EffectiveAccessPlanRow = {
  id: string;
  name: string;
  modalityScope: string | null;
};

/** Plano usado para modalidades/acesso (inclui plano de referência no plano família). */
export async function resolveEffectiveAccessPlan(
  supabase: SupabaseClient,
  studentId: string,
  subscriptionPlanId: string | null
): Promise<EffectiveAccessPlanRow | null> {
  const planId = await resolveEffectiveAccessPlanId(supabase, studentId, subscriptionPlanId);
  if (!planId) return null;

  const { data } = await supabase
    .from("Plan")
    .select("id, name, modalityScope")
    .eq("id", planId)
    .maybeSingle();

  if (!data) return null;
  return {
    id: (data as { id: string }).id,
    name: (data as { name: string }).name,
    modalityScope: (data as { modalityScope?: string | null }).modalityScope ?? null,
  };
}
