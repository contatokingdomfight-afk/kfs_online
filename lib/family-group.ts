/**
 * Grupos familiares: titular + membros; cobrança única no titular
 * (soma dos planos de referência dos membros, com desconto % do grupo).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { KINGDOM_PLAN_FAMILIA_ID, KINGDOM_PLAN_FAMILIA_DEFAULT_MAX_MEMBERS, isFamilyPlan } from "@/lib/kingdom-plans-constants";
import { ensureOnboardingPendingPayments } from "@/lib/ensure-onboarding-pending-payments";
import { syncStudentPaymentStatus } from "@/lib/student-payment-status";
import { getFamilyContext, type FamilyGroupRole, type FamilyGroupRow, type FamilyContext } from "@/lib/family-context";

export { getFamilyContext };
export type { FamilyGroupRole, FamilyGroupRow, FamilyContext };

/** ID do aluno (cada membro tem cobrança própria; mantido para compatibilidade). */
export async function resolveBillingStudentId(
  supabase: SupabaseClient,
  studentId: string
): Promise<string> {
  return studentId;
}

/** Garante a mensalidade pendente do titular de cada grupo activo (cobrança única). */
export async function backfillFamilyGroupTuitions(supabase: SupabaseClient): Promise<number> {
  const { data: groups } = await supabase
    .from("FamilyGroup")
    .select("id, billingStudentId")
    .eq("isActive", true);
  if (!groups?.length) return 0;

  let created = 0;
  for (const g of groups) {
    const billingStudentId = (g as { billingStudentId: string }).billingStudentId;
    const result = await ensureOnboardingPendingPayments(supabase, billingStudentId, KINGDOM_PLAN_FAMILIA_ID);
    if (result.error) continue;
    if (result.created) created += 1;
  }
  return created;
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

export type EnsureFamilyTitularGroupOptions = {
  schoolId?: string;
  maxMembers?: number;
  name?: string | null;
  discountPercent?: number;
  titularReferencePlanId?: string | null;
};

/**
 * Garante que o aluno é titular de um grupo familiar activo.
 * Idempotente: se já é titular, devolve o grupo existente.
 */
export async function ensureFamilyGroupAsTitular(
  supabase: SupabaseClient,
  titularStudentId: string,
  options?: EnsureFamilyTitularGroupOptions
): Promise<{ error?: string; groupId?: string; created?: boolean }> {
  const existing = await getFamilyContext(supabase, titularStudentId);
  if (existing) {
    if (existing.isTitular) {
      return { groupId: existing.group.id, created: false };
    }
    return { error: "Este aluno já é membro de outro grupo familiar." };
  }

  const { data: student } = await supabase
    .from("Student")
    .select("id, schoolId, stripeSubscriptionId")
    .eq("id", titularStudentId)
    .maybeSingle();

  if (!student) return { error: "Aluno não encontrado." };
  if ((student as { stripeSubscriptionId?: string | null }).stripeSubscriptionId) {
    return { error: "O titular tem subscrição Stripe activa. Cancela antes de adicionar ao plano família." };
  }

  const schoolId = options?.schoolId ?? (student as { schoolId?: string | null }).schoolId;
  if (!schoolId) return { error: "Escola é obrigatória para criar o grupo familiar." };

  const maxMembers = options?.maxMembers ?? KINGDOM_PLAN_FAMILIA_DEFAULT_MAX_MEMBERS;
  if (maxMembers < 2) return { error: "O limite de membros deve ser pelo menos 2." };

  const discountPercent = options?.discountPercent ?? 0;
  if (discountPercent < 0 || discountPercent > 100) {
    return { error: "O desconto deve estar entre 0 e 100." };
  }

  const groupId = crypto.randomUUID();
  const { error: groupErr } = await supabase.from("FamilyGroup").insert({
    id: groupId,
    name: options?.name?.trim() || null,
    billingStudentId: titularStudentId,
    planId: KINGDOM_PLAN_FAMILIA_ID,
    maxMembers,
    schoolId,
    isActive: true,
    discountPercent,
  });
  if (groupErr) return { error: groupErr.message };

  const { error: memberErr } = await supabase.from("FamilyGroupMember").insert({
    id: crypto.randomUUID(),
    familyGroupId: groupId,
    studentId: titularStudentId,
    role: "TITULAR",
    referencePlanId: options?.titularReferencePlanId ?? null,
  });
  if (memberErr) {
    await supabase.from("FamilyGroup").delete().eq("id", groupId);
    return { error: memberErr.message };
  }

  return { groupId, created: true };
}

/**
 * Titulares com plano família (incl. cópias «Familly») mas sem FamilyGroupMember.
 * Idempotente; usado ao abrir /admin/familias e após migrações.
 */
export async function repairOrphanFamilyTitulars(supabase: SupabaseClient): Promise<number> {
  const { data: plans } = await supabase.from("Plan").select("id, name");
  const familyPlanIds = (plans ?? [])
    .filter((p) => isFamilyPlan((p as { id: string }).id, (p as { name?: string }).name))
    .map((p) => (p as { id: string }).id);

  if (familyPlanIds.length === 0) return 0;

  const { data: students } = await supabase
    .from("Student")
    .select("id, schoolId")
    .in("planId", familyPlanIds);

  let repaired = 0;
  for (const row of students ?? []) {
    const studentId = (row as { id: string }).id;
    const ctx = await getFamilyContext(supabase, studentId);
    if (ctx) continue;

    const schoolId = (row as { schoolId?: string | null }).schoolId;
    const ensured = await ensureFamilyGroupAsTitular(supabase, studentId, {
      schoolId: schoolId ?? undefined,
    });
    if (ensured.error) continue;

    const assign = await assignFamilyPlanToStudent(supabase, studentId, "TITULAR");
    if (assign.error) continue;

    if (ensured.created) repaired += 1;
  }

  return repaired;
}

/** Atribui plan-familia e cria pagamentos pendentes adequados ao papel. */
export async function assignFamilyPlanToStudent(
  supabase: SupabaseClient,
  studentId: string,
  role: FamilyGroupRole
): Promise<{ error?: string }> {
  if (role === "TITULAR") {
    const ctx = await getFamilyContext(supabase, studentId);
    if (!ctx) {
      const ensured = await ensureFamilyGroupAsTitular(supabase, studentId);
      if (ensured.error) return { error: ensured.error };
    } else if (!ctx.isTitular) {
      return { error: "Este aluno é membro de outro grupo familiar." };
    }
  }

  const { error: planErr } = await supabase
    .from("Student")
    .update({
      planId: KINGDOM_PLAN_FAMILIA_ID,
      primaryModality: null,
      adminGrantedFullAccess: false,
    })
    .eq("id", studentId);

  if (planErr) return { error: planErr.message };

  const pending = await ensureOnboardingPendingPayments(supabase, studentId, KINGDOM_PLAN_FAMILIA_ID);

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
    .select("id, name, billingStudentId, planId, maxMembers, schoolId, isActive, discountPercent")
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

export type FamilyStudentBanner = {
  isTitular: boolean;
  titularName: string;
  groupName: string | null;
  memberCount: number;
  maxMembers: number;
};

/** Contexto para o banner do dashboard do aluno (titular ou membro). */
export async function getFamilyStudentBanner(
  supabase: SupabaseClient,
  studentId: string
): Promise<FamilyStudentBanner | null> {
  const ctx = await getFamilyContext(supabase, studentId);
  if (!ctx) return null;

  // Membros não conseguem ler titular (Student/User) via RLS; service role só para nome/email.
  const reader = getAdminClientOrNull().client ?? supabase;

  const { data: titularStudent } = await reader
    .from("Student")
    .select("userId")
    .eq("id", ctx.billingStudentId)
    .maybeSingle();

  let titularName = "—";
  if (titularStudent?.userId) {
    const { data: user } = await reader
      .from("User")
      .select("name, email")
      .eq("id", titularStudent.userId)
      .maybeSingle();
    titularName = user?.name ?? user?.email ?? "—";
  }

  return {
    isTitular: ctx.isTitular,
    titularName,
    groupName: ctx.group.name,
    memberCount: ctx.memberCount,
    maxMembers: ctx.group.maxMembers,
  };
}

export type FamilyGroupDetail = {
  group: FamilyGroupRow;
  members: Array<{
    id: string;
    studentId: string;
    role: FamilyGroupRole;
    name: string;
    email: string;
    referencePlanId: string | null;
  }>;
};

export async function getFamilyGroupDetail(
  supabase: SupabaseClient,
  groupId: string
): Promise<FamilyGroupDetail | null> {
  const { data: group } = await supabase
    .from("FamilyGroup")
    .select("id, name, billingStudentId, planId, maxMembers, schoolId, isActive, discountPercent")
    .eq("id", groupId)
    .maybeSingle();

  if (!group) return null;

  const { data: memberRows } = await supabase
    .from("FamilyGroupMember")
    .select("id, studentId, role, referencePlanId")
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
      const row = m as { id: string; studentId: string; role: FamilyGroupRole; referencePlanId: string | null };
      const u = userByStudent.get(row.studentId);
      return {
        id: row.id,
        studentId: row.studentId,
        role: row.role,
        name: u?.name ?? "—",
        email: u?.email ?? "",
        referencePlanId: row.referencePlanId,
      };
    }),
  };
}

export type FamilyHubMember = {
  studentId: string;
  name: string;
  role: FamilyGroupRole;
  isSelf: boolean;
};

export type FamilyHubData = {
  groupName: string | null;
  isTitular: boolean;
  maxMembers: number;
  members: FamilyHubMember[];
};

/** Central do aluno: nomes/papéis dos membros do grupo (sem valores financeiros). */
export async function getFamilyHubForStudent(
  supabase: SupabaseClient,
  studentId: string
): Promise<FamilyHubData | null> {
  const ctx = await getFamilyContext(supabase, studentId);
  if (!ctx) return null;

  // RLS bloqueia um membro de ler Student/User de outro aluno; cliente admin só para nomes.
  const reader = getAdminClientOrNull().client ?? supabase;

  const { data: memberRows } = await reader
    .from("FamilyGroupMember")
    .select("studentId, role")
    .eq("familyGroupId", ctx.group.id)
    .order("joinedAt", { ascending: true });

  const rows = (memberRows ?? []) as { studentId: string; role: FamilyGroupRole }[];
  const studentIds = rows.map((r) => r.studentId);
  const { data: students } = studentIds.length
    ? await reader.from("Student").select("id, userId").in("id", studentIds)
    : { data: [] as { id: string; userId: string }[] };
  const userIds = [...new Set((students ?? []).map((s) => s.userId))];
  const { data: users } = userIds.length
    ? await reader.from("User").select("id, name, email").in("id", userIds)
    : { data: [] as { id: string; name: string | null; email: string | null }[] };

  const userByStudent = new Map<string, string>();
  for (const s of students ?? []) {
    const u = (users ?? []).find((x) => x.id === s.userId);
    userByStudent.set(s.id, u?.name ?? u?.email ?? "—");
  }

  return {
    groupName: ctx.group.name,
    isTitular: ctx.isTitular,
    maxMembers: ctx.group.maxMembers,
    members: rows.map((r) => ({
      studentId: r.studentId,
      name: userByStudent.get(r.studentId) ?? "—",
      role: r.role,
      isSelf: r.studentId === studentId,
    })),
  };
}
