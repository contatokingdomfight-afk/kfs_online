"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { ALL_ADMIN_PERMISSION_SET } from "@/lib/permissions/constants";
import { adminAccessAllows, resolveAdminPermissionsForUserId } from "@/lib/permissions/resolve";

export type UpdateUserAdminPermsResult = { error?: string; success?: boolean };

function parseSelectedCodes(formData: FormData): string[] {
  const raw = formData.get("codes");
  if (!raw || typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((c) => c.trim())
    .filter((c) => ALL_ADMIN_PERMISSION_SET.has(c));
}

export async function updateUserAdminPermissions(
  _prev: UpdateUserAdminPermsResult | null,
  formData: FormData
): Promise<UpdateUserAdminPermsResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") {
    return { error: "Não autorizado." };
  }

  const targetId = (formData.get("userId") as string)?.trim();
  if (!targetId) return { error: "Utilizador inválido." };

  const granular = formData.get("adminUseGranular") === "true";
  const codes = parseSelectedCodes(formData);

  const supabase = createAdminClient();
  const access = await resolveAdminPermissionsForUserId(supabase, dbUser.id);
  if (access.kind === "granted" && !adminAccessAllows(access, "admin:sistema:write")) {
    return { error: "Não autorizado a alterar permissões (necessária permissão de sistema — escrita)." };
  }

  const { data: target, error: tErr } = await supabase
    .from("User")
    .select("id, role")
    .eq("id", targetId)
    .single();
  if (tErr || !target) return { error: "Utilizador não encontrado." };
  if (target.role !== "ADMIN" && target.role !== "COACH") {
    return { error: "As permissões detalhadas aplicam-se a contas de administrador ou de treinador (coach)." };
  }

  if (granular && codes.length === 0) {
    return { error: "Com permissões detalhadas activas, escolhe pelo menos um item." };
  }

  if (target.role === "ADMIN") {
    const lockErr = await assertAtLeastOneFullAdminAfter(supabase, targetId, granular);
    if (lockErr) return { error: lockErr };
  }

  const { error: uErr } = await supabase
    .from("User")
    .update({ adminUseGranularPermissions: granular } as { adminUseGranularPermissions: boolean })
    .eq("id", targetId);
  if (uErr) return { error: uErr.message };

  await supabase.from("UserAdminPermission").delete().eq("userId", targetId);

  if (granular && codes.length > 0) {
    const rows = codes.map((code) => ({
      userId: targetId,
      permissionCode: code,
    }));
    const { error: iErr } = await supabase.from("UserAdminPermission").insert(rows);
    if (iErr) return { error: iErr.message };
  }

  revalidatePath("/admin/permissoes");
  revalidatePath(`/admin/permissoes/${targetId}`);
  revalidatePath("/coach");
  return { success: true };
}

type AdminSupa = ReturnType<typeof createAdminClient>;

/**
 * Garante que, após guardar, existe pelo menos um ADMIN com acesso completo
 * (`adminUseGranularPermissions` = false).
 */
async function assertAtLeastOneFullAdminAfter(
  supabase: AdminSupa,
  targetId: string,
  newGranular: boolean
): Promise<string | null> {
  const { data: admins, error } = await supabase
    .from("User")
    .select("id, adminUseGranularPermissions")
    .eq("role", "ADMIN");
  if (error || !admins?.length) return null;
  const after = admins.map((a) => {
    const u = a as { id: string; adminUseGranularPermissions: boolean | null };
    if (u.id === targetId) return { ...u, adminUseGranularPermissions: newGranular };
    return u;
  });
  const full = after.filter((a) => !(a as { adminUseGranularPermissions: boolean | null }).adminUseGranularPermissions);
  if (full.length === 0) {
    return "É necessário manter pelo menos um administrador com acesso completo (sem permissões detalhadas).";
  }
  return null;
}

export type AdminPermissionRow = {
  code: string;
  module: string;
  labelPt: string;
  labelEn: string;
  sortOrder: number;
};

export async function fetchAdminPermissionCatalog(): Promise<AdminPermissionRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("AdminPermission")
    .select("code, module, labelPt, labelEn, sortOrder")
    .order("sortOrder", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminPermissionRow[];
}

export type DeleteAdminResult = { error?: string; success?: boolean };

/**
 * Elimina definitivamente uma conta de administrador (dados ligados + login no Supabase Auth).
 * Nunca permite eliminar a própria conta nem o último ADMIN da plataforma.
 */
export async function deleteAdmin(
  _prev: DeleteAdminResult | null,
  formData: FormData
): Promise<DeleteAdminResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const userId = (formData.get("userId") as string)?.trim();
  if (!userId) return { error: "ID de utilizador inválido." };

  if (dbUser.id === userId) {
    return { error: "Não podes eliminar a tua própria conta." };
  }

  const supabase = createAdminClient();
  const access = await resolveAdminPermissionsForUserId(supabase, dbUser.id);
  if (access.kind === "granted" && !adminAccessAllows(access, "admin:sistema:write")) {
    return { error: "Não autorizado a eliminar administradores (necessária permissão de sistema — escrita)." };
  }

  const { data: target } = await supabase
    .from("User")
    .select("id, role, authUserId")
    .eq("id", userId)
    .maybeSingle();
  if (!target) return { error: "Utilizador não encontrado." };
  if (target.role !== "ADMIN") return { error: "Este utilizador não é administrador." };

  const { count: adminCount } = await supabase
    .from("User")
    .select("id", { count: "exact", head: true })
    .eq("role", "ADMIN");
  if (!adminCount || adminCount <= 1) {
    return { error: "Não é possível eliminar: é o único administrador da plataforma." };
  }

  // Tribo (posts/comentários/likes desta conta, e moderação de posts de outros)
  const { data: posts } = await supabase.from("TribePost").select("id").eq("authorUserId", userId);
  const postIds = (posts ?? []).map((p) => (p as { id: string }).id);
  if (postIds.length > 0) {
    await supabase.from("TribeLike").delete().in("postId", postIds);
    await supabase.from("TribeComment").delete().in("postId", postIds);
    await supabase.from("TribePostMedia").delete().in("postId", postIds);
  }
  await supabase.from("TribeLike").delete().eq("userId", userId);
  await supabase.from("TribeComment").delete().eq("authorUserId", userId);
  await supabase.from("TribePost").update({ hiddenByUserId: null }).eq("hiddenByUserId", userId);
  await supabase.from("TribePost").delete().eq("authorUserId", userId);

  // Perfis eventualmente ligados (defensivo — um admin normalmente não tem Student nem Coach)
  const { data: student } = await supabase.from("Student").select("id").eq("userId", userId).maybeSingle();
  if (student?.id) {
    const studentId = student.id;
    const { data: athlete } = await supabase.from("Athlete").select("id").eq("studentId", studentId).maybeSingle();
    if (athlete?.id) {
      const aid = athlete.id;
      await supabase.from("Comment").delete().eq("targetType", "ATHLETE").eq("targetId", aid);
      await supabase.from("AthleteEvaluation").delete().eq("athleteId", aid);
      await supabase.from("AthleteMissionCompletion").delete().eq("athleteId", aid);
      await supabase.from("AthleteMissionAward").delete().eq("athleteId", aid);
      await supabase.from("Athlete").delete().eq("id", aid);
    }
    await supabase.from("Payment").delete().eq("studentId", studentId);
    await supabase.from("Attendance").delete().eq("studentId", studentId);
    await supabase.from("Notification").delete().eq("studentId", studentId);
    await supabase.from("StudentPhysicalAssessment").delete().eq("studentId", studentId);
    await supabase.from("StudentBadge").delete().eq("studentId", studentId);
    await supabase.from("StudentProfile").delete().eq("studentId", studentId);
    await supabase.from("StudentWaiver").delete().eq("studentId", studentId);
    await supabase.from("StudentEnrollmentForm").delete().eq("studentId", studentId);
    await supabase.from("StudentMembershipAgreement").delete().eq("studentId", studentId);
    await supabase.from("StudentInsuranceCoverage").delete().eq("studentId", studentId);
    await supabase.from("CoursePurchase").delete().eq("studentId", studentId);
    await supabase.from("CourseProgress").delete().eq("student_id", studentId);
    await supabase.from("CourseUnitProgress").delete().eq("student_id", studentId);
    await supabase.from("CourseCompletion").delete().eq("student_id", studentId);
    await supabase.from("EventRegistration").delete().eq("studentId", studentId);
    await supabase.from("CourseCreator").delete().eq("student_id", studentId);
    await supabase.from("StudentExtraSessions").delete().eq("studentId", studentId);
    await supabase.from("PainSelfReport").delete().eq("studentId", studentId);
    await supabase.from("BodyWeightEntry").delete().eq("studentId", studentId);
    await supabase.from("PhysicalBenchmarkEntry").delete().eq("studentId", studentId);
    await supabase.from("PreLessonWellness").delete().eq("studentId", studentId);
    await supabase.from("PhysicalAssessmentRequest").delete().eq("studentId", studentId);
    await supabase.from("RetailSale").delete().eq("studentId", studentId);
    await supabase.from("SchoolAssistantCoach").delete().eq("studentId", studentId);

    const { data: fg } = await supabase.from("FamilyGroup").select("id").eq("billingStudentId", studentId).maybeSingle();
    if (fg?.id) {
      await supabase.from("FamilyGroupMember").delete().eq("familyGroupId", fg.id);
      await supabase.from("FamilyGroup").delete().eq("id", fg.id);
    }
    await supabase.from("FamilyGroupMember").delete().eq("studentId", studentId);

    await supabase.from("Coach").update({ studentId: null }).eq("studentId", studentId);
    await supabase.from("Student").delete().eq("id", studentId);
  }

  const { data: coach } = await supabase.from("Coach").select("id").eq("userId", userId).maybeSingle();
  if (coach?.id) {
    await supabase.from("CoachSchool").delete().eq("coachId", coach.id);
    await supabase.from("LessonCoach").delete().eq("coachId", coach.id);
    await supabase.from("Coach").delete().eq("id", coach.id);
  }

  await supabase.from("Notification").delete().eq("coachUserId", userId);
  await supabase.from("UserAdminPermission").delete().eq("userId", userId);
  await supabase.from("PushSubscription").delete().eq("userId", userId);

  const { error: delUserErr } = await supabase.from("User").delete().eq("id", userId);
  if (delUserErr) return { error: delUserErr.message };

  const authId = target.authUserId as string | undefined;
  if (authId) {
    const { error: authErr } = await supabase.auth.admin.deleteUser(authId);
    if (authErr) {
      console.error("deleteAdmin: auth.admin.deleteUser failed:", authErr);
      return {
        error:
          "Dados removidos, mas falhou a remoção da conta de login no Supabase Auth. Remove manualmente em Authentication → Users.",
      };
    }
  }

  revalidatePath("/admin/permissoes");
  redirect("/admin/permissoes");
}
