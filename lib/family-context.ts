/**
 * Leitura do contexto familiar (titular/membro). Módulo folha — sem dependências
 * de `family-group.ts`/`student-payment-status.ts` — para evitar import circular.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type FamilyGroupRole = "TITULAR" | "MEMBER";

export type FamilyGroupRow = {
  id: string;
  name: string | null;
  billingStudentId: string;
  planId: string;
  maxMembers: number;
  schoolId: string;
  isActive: boolean;
  discountPercent: number;
};

export type FamilyContext = {
  group: FamilyGroupRow;
  role: FamilyGroupRole;
  isTitular: boolean;
  billingStudentId: string;
  memberCount: number;
};

type MemberJoinRow = {
  role: FamilyGroupRole;
  familyGroupId: string;
};

/** Contexto familiar activo do aluno (grupo activo). */
export async function getFamilyContext(
  supabase: SupabaseClient,
  studentId: string
): Promise<FamilyContext | null> {
  const { data: member } = await supabase
    .from("FamilyGroupMember")
    .select("role, familyGroupId")
    .eq("studentId", studentId)
    .maybeSingle();

  if (!member) return null;

  const memberRow = member as MemberJoinRow;
  const { data: group } = await supabase
    .from("FamilyGroup")
    .select("id, name, billingStudentId, planId, maxMembers, schoolId, isActive, discountPercent")
    .eq("id", memberRow.familyGroupId)
    .maybeSingle();

  if (!group || !(group as FamilyGroupRow).isActive) return null;

  const { count } = await supabase
    .from("FamilyGroupMember")
    .select("id", { count: "exact", head: true })
    .eq("familyGroupId", memberRow.familyGroupId);

  const role = memberRow.role;
  return {
    group: group as FamilyGroupRow,
    role,
    isTitular: role === "TITULAR",
    billingStudentId: (group as FamilyGroupRow).billingStudentId,
    memberCount: count ?? 0,
  };
}
