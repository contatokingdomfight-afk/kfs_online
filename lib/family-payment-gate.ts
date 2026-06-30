/**
 * Gate de pagamento para membros de plano família (Edge-safe: só queries Supabase).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

async function getActiveFamilyBillingId(
  supabase: SupabaseClient,
  studentId: string
): Promise<string | null> {
  const { data: member } = await supabase
    .from("FamilyGroupMember")
    .select("role, familyGroupId")
    .eq("studentId", studentId)
    .maybeSingle();

  if (!member || (member as { role: string }).role === "TITULAR") return null;

  const { data: group } = await supabase
    .from("FamilyGroup")
    .select("billingStudentId, isActive")
    .eq("id", (member as { familyGroupId: string }).familyGroupId)
    .maybeSingle();

  if (!group || !(group as { isActive: boolean }).isActive) return null;
  return (group as { billingStudentId: string }).billingStudentId;
}

/** Aluno desbloqueado: tem PAID próprio ou é membro com titular que já pagou. */
export async function studentHasPaymentUnlock(
  supabase: SupabaseClient,
  studentId: string,
  adminGrantedFullAccess: boolean
): Promise<boolean> {
  if (adminGrantedFullAccess) return true;

  const { count: ownPaid } = await supabase
    .from("Payment")
    .select("id", { count: "exact", head: true })
    .eq("studentId", studentId)
    .eq("status", "PAID");

  if ((ownPaid ?? 0) > 0) return true;

  const billingId = await getActiveFamilyBillingId(supabase, studentId);
  if (!billingId) return false;

  const { count: titularPaid } = await supabase
    .from("Payment")
    .select("id", { count: "exact", head: true })
    .eq("studentId", billingId)
    .eq("status", "PAID");

  return (titularPaid ?? 0) > 0;
}
