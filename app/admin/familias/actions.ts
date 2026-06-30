"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { searchStudentIdsByQuery } from "@/lib/admin-search-students";
import {
  assignFamilyPlanToStudent,
  getFamilyContext,
} from "@/lib/family-group";
import { KINGDOM_PLAN_FAMILIA_ID } from "@/lib/kingdom-plans-constants";

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

  if (!titularStudentId) return { error: "Titular é obrigatório." };
  if (!schoolId) return { error: "Escola é obrigatória." };
  if (Number.isNaN(maxMembers) || maxMembers < 2) {
    return { error: "O limite de membros deve ser pelo menos 2." };
  }

  const supabase = createAdminClient();

  const { data: existingMember } = await supabase
    .from("FamilyGroupMember")
    .select("id")
    .eq("studentId", titularStudentId)
    .maybeSingle();
  if (existingMember?.id) return { error: "Este aluno já pertence a um grupo familiar." };

  const { data: titular } = await supabase
    .from("Student")
    .select("id, stripeSubscriptionId")
    .eq("id", titularStudentId)
    .maybeSingle();
  if (!titular) return { error: "Aluno titular não encontrado." };
  if ((titular as { stripeSubscriptionId?: string | null }).stripeSubscriptionId) {
    return { error: "O titular tem subscrição Stripe activa. Cancela antes de adicionar ao plano família." };
  }

  const groupId = crypto.randomUUID();
  const { error: groupErr } = await supabase.from("FamilyGroup").insert({
    id: groupId,
    name,
    billingStudentId: titularStudentId,
    planId: KINGDOM_PLAN_FAMILIA_ID,
    maxMembers,
    schoolId,
    isActive: true,
  });
  if (groupErr) return { error: groupErr.message };

  const { error: memberErr } = await supabase.from("FamilyGroupMember").insert({
    id: crypto.randomUUID(),
    familyGroupId: groupId,
    studentId: titularStudentId,
    role: "TITULAR",
  });
  if (memberErr) {
    await supabase.from("FamilyGroup").delete().eq("id", groupId);
    return { error: memberErr.message };
  }

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
  });
  if (insertErr) return { error: insertErr.message };

  const planResult = await assignFamilyPlanToStudent(supabase, studentId, "MEMBER");
  if (planResult.error) {
    await supabase.from("FamilyGroupMember").delete().eq("studentId", studentId);
    return { error: planResult.error };
  }

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

  revalidatePath("/admin/familias");
  revalidatePath(`/admin/familias/${groupId}`);
  revalidatePath(`/admin/alunos/${studentId}`);
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
