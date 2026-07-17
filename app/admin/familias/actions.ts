"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { searchStudentIdsByQuery } from "@/lib/admin-search-students";
import {
  assignFamilyPlanToStudent,
  getFamilyContext,
  ensureFamilyGroupAsTitular,
} from "@/lib/family-group";
import { refreshFamilyTitularPendingTuition } from "@/lib/family-tuition";

export type FamilyActionResult = { error?: string };

async function assertAdmin() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return null;
  return dbUser;
}

export async function searchStudentsForFamily(query: string): Promise<
  { error: string } | { results: Array<{ studentId: string; name: string; email: string }> }
> {
  if (!(await assertAdmin())) return { error: "Não autorizado." };

  const q = query.trim();
  if (q.length < 2) return { error: "Indica pelo menos 2 caracteres." };

  const supabase = createAdminClient();
  const ids = await searchStudentIdsByQuery(supabase, q);
  if (ids.length === 0) return { results: [] };

  const { data: students } = await supabase.from("Student").select("id, userId").in("id", ids);
  const userIds = [...new Set((students ?? []).map((s) => s.userId))];
  const { data: users } = await supabase.from("User").select("id, name, email").in("id", userIds);
  const userById = new Map((users ?? []).map((u) => [u.id, u]));

  const results = (students ?? []).map((s) => {
    const u = userById.get(s.userId);
    return {
      studentId: s.id,
      name: u?.name ?? u?.email ?? "—",
      email: u?.email ?? "",
    };
  });

  results.sort((a, b) => a.name.localeCompare(b.name, "pt"));
  return { results };
}

export async function createFamilyGroup(
  _prev: FamilyActionResult | null,
  formData: FormData
): Promise<FamilyActionResult> {
  if (!(await assertAdmin())) return { error: "Não autorizado." };

  const name = (formData.get("name") as string)?.trim() || null;
  const titularStudentId = (formData.get("titularStudentId") as string)?.trim();
  const schoolId = (formData.get("schoolId") as string)?.trim();
  const maxMembers = parseInt((formData.get("maxMembers") as string)?.trim() || "0", 10);
  const discountPercent = parseFloat((formData.get("discountPercent") as string)?.trim() || "0");
  const titularReferencePlanId = (formData.get("titularReferencePlanId") as string)?.trim() || null;

  if (!titularStudentId) return { error: "Titular é obrigatório." };
  if (!schoolId) return { error: "Escola é obrigatória." };
  if (Number.isNaN(maxMembers) || maxMembers < 2) {
    return { error: "O limite de membros deve ser pelo menos 2." };
  }
  if (Number.isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
    return { error: "O desconto deve estar entre 0 e 100." };
  }

  const supabase = createAdminClient();

  const ensured = await ensureFamilyGroupAsTitular(supabase, titularStudentId, {
    name,
    schoolId,
    maxMembers,
    discountPercent,
    titularReferencePlanId,
  });
  if (ensured.error) return { error: ensured.error };
  const groupId = ensured.groupId!;

  const planResult = await assignFamilyPlanToStudent(supabase, titularStudentId, "TITULAR");
  if (planResult.error) return { error: planResult.error };

  revalidatePath("/admin/familias");
  revalidatePath(`/admin/alunos/${titularStudentId}`);
  redirect(`/admin/familias/${groupId}`);
}

export async function addFamilyMember(
  _prev: FamilyActionResult | null,
  formData: FormData
): Promise<FamilyActionResult> {
  if (!(await assertAdmin())) return { error: "Não autorizado." };

  const groupId = (formData.get("groupId") as string)?.trim();
  const studentId = (formData.get("studentId") as string)?.trim();
  const referencePlanId = (formData.get("referencePlanId") as string)?.trim() || null;
  if (!groupId || !studentId) return { error: "Grupo e aluno são obrigatórios." };

  const supabase = createAdminClient();

  const { data: group } = await supabase
    .from("FamilyGroup")
    .select("id, maxMembers, isActive, billingStudentId")
    .eq("id", groupId)
    .maybeSingle();
  if (!group?.isActive) return { error: "Grupo não encontrado ou inactivo." };
  if (studentId === group.billingStudentId) return { error: "O titular já está no grupo." };

  const { count } = await supabase
    .from("FamilyGroupMember")
    .select("id", { count: "exact", head: true })
    .eq("familyGroupId", groupId);
  if ((count ?? 0) >= group.maxMembers) {
    return { error: `O grupo já atingiu o limite de ${group.maxMembers} membros.` };
  }

  const { data: existingMember } = await supabase
    .from("FamilyGroupMember")
    .select("id")
    .eq("studentId", studentId)
    .maybeSingle();
  if (existingMember?.id) return { error: "Este aluno já pertence a um grupo familiar." };

  const { data: student } = await supabase
    .from("Student")
    .select("id, stripeSubscriptionId")
    .eq("id", studentId)
    .maybeSingle();
  if (!student) return { error: "Aluno não encontrado." };
  if ((student as { stripeSubscriptionId?: string | null }).stripeSubscriptionId) {
    return { error: "O aluno tem subscrição Stripe activa." };
  }

  const { error: insertErr } = await supabase.from("FamilyGroupMember").insert({
    id: crypto.randomUUID(),
    familyGroupId: groupId,
    studentId,
    role: "MEMBER",
    referencePlanId,
  });
  if (insertErr) return { error: insertErr.message };

  const planResult = await assignFamilyPlanToStudent(supabase, studentId, "MEMBER");
  if (planResult.error) {
    await supabase.from("FamilyGroupMember").delete().eq("studentId", studentId);
    return { error: planResult.error };
  }

  await refreshFamilyTitularPendingTuition(supabase, groupId);

  revalidatePath("/admin/familias");
  revalidatePath(`/admin/familias/${groupId}`);
  revalidatePath(`/admin/alunos/${studentId}`);
  return {};
}

export async function removeFamilyMember(
  _prev: FamilyActionResult | null,
  formData: FormData
): Promise<FamilyActionResult> {
  if (!(await assertAdmin())) return { error: "Não autorizado." };

  const groupId = (formData.get("groupId") as string)?.trim();
  const studentId = (formData.get("studentId") as string)?.trim();
  if (!groupId || !studentId) return { error: "Dados inválidos." };

  const supabase = createAdminClient();

  const { data: member } = await supabase
    .from("FamilyGroupMember")
    .select("role")
    .eq("familyGroupId", groupId)
    .eq("studentId", studentId)
    .maybeSingle();
  if (!member) return { error: "Membro não encontrado." };
  if ((member as { role: string }).role === "TITULAR") {
    return { error: "Não é possível remover o titular. Desactiva o grupo ou altera o titular." };
  }

  await supabase.from("FamilyGroupMember").delete().eq("studentId", studentId);
  await supabase
    .from("Student")
    .update({ planId: null })
    .eq("id", studentId);

  await refreshFamilyTitularPendingTuition(supabase, groupId);

  revalidatePath("/admin/familias");
  revalidatePath(`/admin/familias/${groupId}`);
  revalidatePath(`/admin/alunos/${studentId}`);
  return {};
}

/** Actualiza o desconto % default do grupo (aplica-se ao recalcular a mensalidade pendente do titular). */
export async function updateFamilyGroupDiscount(
  _prev: FamilyActionResult | null,
  formData: FormData
): Promise<FamilyActionResult> {
  if (!(await assertAdmin())) return { error: "Não autorizado." };

  const groupId = (formData.get("groupId") as string)?.trim();
  const discountPercent = parseFloat((formData.get("discountPercent") as string)?.trim() || "");
  if (!groupId) return { error: "Grupo inválido." };
  if (Number.isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
    return { error: "O desconto deve estar entre 0 e 100." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("FamilyGroup")
    .update({ discountPercent, updatedAt: new Date().toISOString() })
    .eq("id", groupId);
  if (error) return { error: error.message };

  await refreshFamilyTitularPendingTuition(supabase, groupId);

  revalidatePath(`/admin/familias/${groupId}`);
  return {};
}

/** Actualiza o plano de referência (só para cálculo do valor) de um membro. */
export async function updateMemberReferencePlan(
  _prev: FamilyActionResult | null,
  formData: FormData
): Promise<FamilyActionResult> {
  if (!(await assertAdmin())) return { error: "Não autorizado." };

  const groupId = (formData.get("groupId") as string)?.trim();
  const studentId = (formData.get("studentId") as string)?.trim();
  const referencePlanId = (formData.get("referencePlanId") as string)?.trim() || null;
  if (!groupId || !studentId) return { error: "Dados inválidos." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("FamilyGroupMember")
    .update({ referencePlanId })
    .eq("familyGroupId", groupId)
    .eq("studentId", studentId);
  if (error) return { error: error.message };

  await refreshFamilyTitularPendingTuition(supabase, groupId);

  revalidatePath(`/admin/familias/${groupId}`);
  return {};
}

export async function deactivateFamilyGroup(
  _prev: FamilyActionResult | null,
  formData: FormData
): Promise<FamilyActionResult> {
  if (!(await assertAdmin())) return { error: "Não autorizado." };

  const groupId = (formData.get("groupId") as string)?.trim();
  if (!groupId) return { error: "Grupo inválido." };

  const supabase = createAdminClient();
  await supabase.from("FamilyGroup").update({ isActive: false, updatedAt: new Date().toISOString() }).eq("id", groupId);

  revalidatePath("/admin/familias");
  revalidatePath(`/admin/familias/${groupId}`);
  return {};
}

export async function getStudentFamilyBadge(
  studentId: string
): Promise<{ role: "TITULAR" | "MEMBER"; groupId: string; groupName: string | null } | null> {
  if (!(await assertAdmin())) return null;
  const supabase = createAdminClient();
  const ctx = await getFamilyContext(supabase, studentId);
  if (!ctx) return null;
  return {
    role: ctx.role,
    groupId: ctx.group.id,
    groupName: ctx.group.name,
  };
}
