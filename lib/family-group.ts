/**
 * Grupos familiares: um titular paga a mensalidade; membros herdam acesso e estado de pagamento.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { KINGDOM_PLAN_FAMILIA_ID } from "@/lib/kingdom-plans-constants";
import { ensureOnboardingPendingPayments } from "@/lib/ensure-onboarding-pending-payments";
import { syncStudentPaymentStatus } from "@/lib/student-payment-status";

export type FamilyGroupRole = "TITULAR" | "MEMBER";

export type FamilyGroupRow = {
  id: string;
  name: string | null;
  billingStudentId: string;
  planId: string;
  maxMembers: number;
  schoolId: string;
  isActive: boolean;
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
    .select("id, name, billingStudentId, planId, maxMembers, schoolId, isActive")
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

/** ID do aluno que paga a mensalidade (titular ou próprio). */
export async function resolveBillingStudentId(
  supabase: SupabaseClient,
  studentId: string
): Promise<string> {
  const ctx = await getFamilyContext(supabase, studentId);
  if (!ctx) return studentId;
  return ctx.billingStudentId;
}

export async function isFamilyNonTitularMember(
  supabase: SupabaseClient,
  studentId: string
): Promise<boolean> {
  const ctx = await getFamilyContext(supabase, studentId);
  return Boolean(ctx && !ctx.isTitular);
}

/** Membro não-titular com titular que já tem pelo menos um pagamento PAID. */
export async function familyMemberInheritsTitularAccess(
  supabase: SupabaseClient,
  studentId: string
): Promise<boolean> {
  const ctx = await getFamilyContext(supabase, studentId);
  if (!ctx || ctx.isTitular) return false;

  const { count } = await supabase
    .from("Payment")
    .select("id", { count: "exact", head: true })
    .eq("studentId", ctx.billingStudentId)
    .eq("status", "PAID");

  return (count ?? 0) > 0;
}

/** IDs de alunos que não devem receber mensalidade TUITION automática (membros não-titular). */
export async function loadNonBillingFamilyMemberIds(
  supabase: SupabaseClient
): Promise<Set<string>> {
  const { data: groups } = await supabase
    .from("FamilyGroup")
    .select("id, billingStudentId")
    .eq("isActive", true);

  if (!groups?.length) return new Set();

  const groupIds = groups.map((g) => g.id);
  const billingIds = new Set(groups.map((g) => g.billingStudentId));

  const { data: members } = await supabase
    .from("FamilyGroupMember")
    .select("studentId, familyGroupId")
    .in("familyGroupId", groupIds);

  const skip = new Set<string>();
  for (const m of members ?? []) {
    const sid = (m as { studentId: string }).studentId;
    if (!billingIds.has(sid)) skip.add(sid);
  }
  return skip;
}

/** Ao titular pagar, repõe grace/plano dos membros do grupo. */
export async function syncFamilyMembersOnTitularPayment(
  supabase: SupabaseClient,
  titularStudentId: string
): Promise<void> {
  const { data: group } = await supabase
    .from("FamilyGroup")
    .select("id")
    .eq("billingStudentId", titularStudentId)
    .eq("isActive", true)
    .maybeSingle();

  if (!group?.id) return;

  const { data: members } = await supabase
    .from("FamilyGroupMember")
    .select("studentId")
    .eq("familyGroupId", group.id)
    .neq("studentId", titularStudentId);

  for (const m of members ?? []) {
    const memberId = (m as { studentId: string }).studentId;
    const { data: memberRow } = await supabase
      .from("Student")
      .select("planId, suspendedPlanId, paymentSuspendedAt, paymentGraceEndsAt")
      .eq("id", memberId)
      .maybeSingle();

    if (!memberRow) continue;

    const row = memberRow as {
      planId: string | null;
      suspendedPlanId: string | null;
      paymentSuspendedAt: string | null;
      paymentGraceEndsAt: string | null;
    };

    const updates: Record<string, unknown> = {
      paymentGraceEndsAt: null,
      paymentGraceReferenceMonth: null,
    };

    if (!row.planId && row.suspendedPlanId) {
      updates.planId = row.suspendedPlanId;
      updates.suspendedPlanId = null;
      updates.paymentSuspendedAt = null;
    } else if (row.paymentSuspendedAt) {
      updates.paymentSuspendedAt = null;
      updates.suspendedPlanId = null;
    }

    await supabase.from("Student").update(updates).eq("id", memberId);
    await syncStudentPaymentStatus(supabase, memberId);
  }
}

/** Suspende plano de todos os membros quando o titular é suspenso. */
export async function syncFamilyMembersOnTitularSuspension(
  supabase: SupabaseClient,
  titularStudentId: string,
  suspendedPlanId: string
): Promise<void> {
  const { data: group } = await supabase
    .from("FamilyGroup")
    .select("id")
    .eq("billingStudentId", titularStudentId)
    .eq("isActive", true)
    .maybeSingle();

  if (!group?.id) return;

  const { data: members } = await supabase
    .from("FamilyGroupMember")
    .select("studentId")
    .eq("familyGroupId", group.id)
    .neq("studentId", titularStudentId);

  const nowIso = new Date().toISOString();
  for (const m of members ?? []) {
    const memberId = (m as { studentId: string }).studentId;
    const { data: memberRow } = await supabase
      .from("Student")
      .select("planId, paymentSuspendedAt")
      .eq("id", memberId)
      .maybeSingle();

    const row = memberRow as { planId: string | null; paymentSuspendedAt: string | null } | null;
    if (!row?.planId || row.paymentSuspendedAt) continue;

    await supabase
      .from("Student")
      .update({
        suspendedPlanId: row.planId ?? suspendedPlanId,
        planId: null,
        paymentSuspendedAt: nowIso,
        paymentGraceEndsAt: null,
        paymentGraceReferenceMonth: null,
      })
      .eq("id", memberId);

    await syncStudentPaymentStatus(supabase, memberId);
  }
}

/** Atribui plan-familia e cria pagamentos pendentes adequados ao papel. */
export async function assignFamilyPlanToStudent(
  supabase: SupabaseClient,
  studentId: string,
  role: FamilyGroupRole
): Promise<{ error?: string }> {
  const { error: planErr } = await supabase
    .from("Student")
    .update({ planId: KINGDOM_PLAN_FAMILIA_ID, adminGrantedFullAccess: false })
    .eq("id", studentId);

  if (planErr) return { error: planErr.message };

  const pending = await ensureOnboardingPendingPayments(supabase, studentId, KINGDOM_PLAN_FAMILIA_ID, {
    skipTuition: role === "MEMBER",
  });

  if (pending.error) return { error: pending.error };
  return {};
}

export type FamilyGroupListItem = FamilyGroupRow & {
  titularName: string;
  memberCount: number;
};

/** Lista grupos para admin. */
export async function listFamilyGroups(supabase: SupabaseClient): Promise<FamilyGroupListItem[]> {
  const { data: groups } = await supabase
    .from("FamilyGroup")
    .select("id, name, billingStudentId, planId, maxMembers, schoolId, isActive")
    .order("createdAt", { ascending: false });

  if (!groups?.length) return [];

  const billingIds = [...new Set(groups.map((g) => g.billingStudentId))];
  const { data: students } = await supabase
    .from("Student")
    .select("id, userId")
    .in("id", billingIds);
  const userIds = [...new Set((students ?? []).map((s) => s.userId))];
  const { data: users } = await supabase.from("User").select("id, name, email").in("id", userIds);

  const userByStudent = new Map<string, { name: string | null; email: string | null }>();
  for (const s of students ?? []) {
    const u = (users ?? []).find((x) => x.id === (s as { userId: string }).userId);
    userByStudent.set((s as { id: string }).id, {
      name: u?.name ?? null,
      email: u?.email ?? null,
    });
  }

  const items: FamilyGroupListItem[] = [];
  for (const g of groups) {
    const { count } = await supabase
      .from("FamilyGroupMember")
      .select("id", { count: "exact", head: true })
      .eq("familyGroupId", g.id);

    const titular = userByStudent.get(g.billingStudentId);
    items.push({
      ...(g as FamilyGroupRow),
      titularName: titular?.name ?? titular?.email ?? g.billingStudentId,
      memberCount: count ?? 0,
    });
  }
  return items;
}

export type FamilyGroupDetail = {
  group: FamilyGroupRow;
  members: Array<{
    id: string;
    studentId: string;
    role: FamilyGroupRole;
    name: string;
    email: string;
  }>;
};

export async function getFamilyGroupDetail(
  supabase: SupabaseClient,
  groupId: string
): Promise<FamilyGroupDetail | null> {
  const { data: group } = await supabase
    .from("FamilyGroup")
    .select("id, name, billingStudentId, planId, maxMembers, schoolId, isActive")
    .eq("id", groupId)
    .maybeSingle();

  if (!group) return null;

  const { data: memberRows } = await supabase
    .from("FamilyGroupMember")
    .select("id, studentId, role")
    .eq("familyGroupId", groupId)
    .order("joinedAt", { ascending: true });

  const studentIds = (memberRows ?? []).map((m) => (m as { studentId: string }).studentId);
  const { data: students } = studentIds.length
    ? await supabase.from("Student").select("id, userId").in("id", studentIds)
    : { data: [] as { id: string; userId: string }[] };

  const userIds = [...new Set((students ?? []).map((s) => s.userId))];
  const { data: users } = userIds.length
    ? await supabase.from("User").select("id, name, email").in("id", userIds)
    : { data: [] as { id: string; name: string | null; email: string | null }[] };

  const userByStudent = new Map<string, { name: string; email: string }>();
  for (const s of students ?? []) {
    const u = (users ?? []).find((x) => x.id === s.userId);
    userByStudent.set(s.id, {
      name: u?.name ?? u?.email ?? "—",
      email: u?.email ?? "",
    });
  }

  return {
    group: group as FamilyGroupRow,
    members: (memberRows ?? []).map((m) => {
      const row = m as { id: string; studentId: string; role: FamilyGroupRole };
      const u = userByStudent.get(row.studentId);
      return {
        id: row.id,
        studentId: row.studentId,
        role: row.role,
        name: u?.name ?? "—",
        email: u?.email ?? "",
      };
    }),
  };
}
