"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/server";

export type CreateCoachResult = { error?: string };

export async function createCoach(
  _prev: CreateCoachResult | null,
  formData: FormData
): Promise<CreateCoachResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const email = (formData.get("email") as string)?.trim();
  const name = (formData.get("name") as string)?.trim() || null;
  const specialties = (formData.get("specialties") as string)?.trim() || null;
  const schoolIds = formData.getAll("schoolIds").filter((v): v is string => typeof v === "string" && v.trim() !== "");
  const createStudentProfile = formData.get("createStudentProfile") === "true";

  if (!email) return { error: "Email é obrigatório." };
  if (schoolIds.length === 0) return { error: "Seleciona pelo menos uma escola onde o coach pode lecionar." };
  const primarySchoolId = schoolIds[0]!;

  const supabase = createAdminClient();

  const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { full_name: name ?? undefined },
  });

  if (inviteError) {
    if (inviteError.message.includes("already been registered")) {
      return { error: "Já existe um utilizador com este email." };
    }
    return { error: inviteError.message };
  }

  const authUser = inviteData?.user;
  if (!authUser?.id) {
    return {
      error: "Convite enviado, mas não foi possível criar o registo local. O coach pode fazer login e o perfil pode ser criado manualmente.",
    };
  }

  const userId = crypto.randomUUID();
  const coachId = crypto.randomUUID();

  const { error: userError } = await supabase.from("User").insert({
    id: userId,
    authUserId: authUser.id,
    email: authUser.email ?? email,
    name: name ?? authUser.user_metadata?.full_name ?? null,
    role: "COACH",
  });

  if (userError) return { error: userError.message };

  let studentId: string | null = null;

  // Se solicitado, criar perfil de aluno para o coach
  if (createStudentProfile) {
    studentId = crypto.randomUUID();
    const { error: studentError } = await supabase.from("Student").insert({
      id: studentId,
      userId,
      schoolId: primarySchoolId,
      status: "ATIVO",
    });

    if (studentError) {
      // Se já existe student, buscar o ID
      if (studentError.code === '23505') {
        const { data: existingStudent } = await supabase
          .from("Student")
          .select("id")
          .eq("userId", userId)
          .single();
        if (existingStudent) {
          studentId = existingStudent.id;
        }
      } else {
        return { error: studentError.message };
      }
    }
  }

  const { error: coachError } = await supabase.from("Coach").insert({
    id: coachId,
    userId,
    studentId,
    specialties,
  });

  if (coachError) return { error: coachError.message };

  const schoolRows = schoolIds.map((schoolId) => ({ coachId, schoolId }));
  const { error: csError } = await supabase.from("CoachSchool").insert(schoolRows);
  if (csError) return { error: csError.message };

  revalidatePath("/admin/coaches");
  revalidatePath("/admin/coaches/novo");
  redirect("/admin/coaches");
}

export type UpdateCoachResult = { error?: string };

export async function updateCoach(_prev: UpdateCoachResult | null, formData: FormData): Promise<UpdateCoachResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const coachId = (formData.get("coachId") as string)?.trim();
  if (!coachId) return { error: "ID do coach inválido." };

  const name = (formData.get("name") as string)?.trim() || null;
  const specialties = (formData.get("specialties") as string)?.trim() || null;
  const canCreateCourses = formData.get("can_create_courses") === "on";
  const hourlyRateRaw = (formData.get("hourly_rate") as string)?.trim();
  const hourlyRate = hourlyRateRaw ? parseFloat(hourlyRateRaw) : null;
  const schoolIds = formData.getAll("schoolIds").filter((v): v is string => typeof v === "string" && v.trim() !== "");

  const supabase = createAdminClient();

  const { data: coach } = await supabase.from("Coach").select("id, userId, studentId").eq("id", coachId).single();
  if (!coach) return { error: "Coach não encontrado." };

  if (schoolIds.length === 0) return { error: "Seleciona pelo menos uma escola." };

  if (name !== undefined) {
    const { error: userError } = await supabase.from("User").update({ name }).eq("id", coach.userId);
    if (userError) return { error: userError.message };
  }

  const { error: coachError } = await supabase
    .from("Coach")
    .update({ specialties, hourly_rate: hourlyRate })
    .eq("id", coachId);

  if (coachError) return { error: coachError.message };

  await supabase.from("CoachSchool").delete().eq("coachId", coachId);
  const { error: csError } = await supabase
    .from("CoachSchool")
    .insert(schoolIds.map((schoolId) => ({ coachId, schoolId })));
  if (csError) return { error: csError.message };

  if (coach.studentId) {
    const { error: studentError } = await supabase
      .from("Student")
      .update({ can_create_courses: canCreateCourses })
      .eq("id", coach.studentId);
    if (studentError) return { error: studentError.message };
  }

  revalidatePath("/admin/coaches");
  revalidatePath(`/admin/coaches/${coachId}`);
  return {};
}

export async function setCoachActive(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const coachId = (formData.get("coachId") as string)?.trim();
  const active = formData.get("active") === "true";
  if (!coachId) return { error: "ID do coach inválido." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("Coach").update({ is_active: active }).eq("id", coachId);
  if (error) return { error: error.message };

  revalidatePath("/admin/coaches");
  revalidatePath(`/admin/coaches/${coachId}`);
  return {};
}

export async function deleteCoach(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const coachId = (formData.get("coachId") as string)?.trim();
  if (!coachId) return { error: "ID do coach inválido." };

  const supabase = createAdminClient();
  const { data: coach } = await supabase.from("Coach").select("id, userId").eq("id", coachId).single();
  if (!coach) return { error: "Coach não encontrado." };

  const { error: deleteError } = await supabase.from("Coach").delete().eq("id", coachId);
  if (deleteError) return { error: deleteError.message };

  await supabase.from("User").update({ role: "USER" }).eq("id", coach.userId);

  revalidatePath("/admin/coaches");
  revalidatePath(`/admin/coaches/${coachId}`);
  redirect("/admin/coaches");
}

export type DeleteCoachAccountResult = { error?: string };

/**
 * Elimina definitivamente a conta do coach: dados de coach, perfil de aluno
 * ligado (se existir), registo User e conta de login (Supabase Auth). Ao
 * contrário de `deleteCoach` (que só remove o acesso à área professor), esta
 * ação não pode ser desfeita.
 */
export async function deleteCoachAccount(
  _prev: DeleteCoachAccountResult | null,
  formData: FormData
): Promise<DeleteCoachAccountResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const coachId = (formData.get("coachId") as string)?.trim();
  if (!coachId) return { error: "ID do coach inválido." };

  const supabase = createAdminClient();

  const { data: coach } = await supabase.from("Coach").select("id, userId, studentId").eq("id", coachId).single();
  if (!coach) return { error: "Coach não encontrado." };

  if (dbUser.id === coach.userId) {
    return { error: "Não podes eliminar a tua própria conta neste ecrã." };
  }

  const { data: user } = await supabase
    .from("User")
    .select("id, role, authUserId")
    .eq("id", coach.userId)
    .single();
  if (!user) return { error: "Utilizador não encontrado." };

  const studentId = coach.studentId as string | null;

  if (studentId) {
    const { count: courseCreatorCount } = await supabase
      .from("Course")
      .select("id", { count: "exact", head: true })
      .eq("creator_student_id", studentId);
    if (courseCreatorCount && courseCreatorCount > 0) {
      return {
        error:
          "Este coach é criador principal de um ou mais cursos. Transfere a propriedade ou remove os cursos em Admin → Cursos antes de eliminar.",
      };
    }

    const { data: student } = await supabase
      .from("Student")
      .select("id, stripeSubscriptionId")
      .eq("id", studentId)
      .maybeSingle();
    const subId = (student as { stripeSubscriptionId?: string | null } | null)?.stripeSubscriptionId;
    if (subId && stripe) {
      try {
        await stripe.subscriptions.cancel(subId);
      } catch (e) {
        console.warn("deleteCoachAccount: Stripe subscription cancel failed:", e);
      }
    }
  }

  // Tribo (posts/comentários/likes desta conta, e moderação de posts de outros)
  const { data: posts } = await supabase.from("TribePost").select("id").eq("authorUserId", coach.userId);
  const postIds = (posts ?? []).map((p) => (p as { id: string }).id);
  if (postIds.length > 0) {
    await supabase.from("TribeLike").delete().in("postId", postIds);
    await supabase.from("TribeComment").delete().in("postId", postIds);
    await supabase.from("TribePostMedia").delete().in("postId", postIds);
  }
  await supabase.from("TribeLike").delete().eq("userId", coach.userId);
  await supabase.from("TribeComment").delete().eq("authorUserId", coach.userId);
  await supabase.from("TribePost").update({ hiddenByUserId: null }).eq("hiddenByUserId", coach.userId);
  await supabase.from("TribePost").delete().eq("authorUserId", coach.userId);

  // Remove o Coach (e a ligação a School/Lesson) antes do Student para não violar a FK Coach.studentId.
  await supabase.from("CoachSchool").delete().eq("coachId", coachId);
  await supabase.from("LessonCoach").delete().eq("coachId", coachId);
  await supabase.from("Coach").delete().eq("id", coachId);

  if (studentId) {
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

    await supabase.from("Student").delete().eq("id", studentId);
  }

  await supabase.from("Notification").delete().eq("coachUserId", coach.userId);
  await supabase.from("UserAdminPermission").delete().eq("userId", coach.userId);
  await supabase.from("PushSubscription").delete().eq("userId", coach.userId);

  const { error: delUserErr } = await supabase.from("User").delete().eq("id", coach.userId);
  if (delUserErr) return { error: delUserErr.message };

  const authId = (user as { authUserId?: string | null }).authUserId as string | undefined;
  if (authId) {
    const { error: authErr } = await supabase.auth.admin.deleteUser(authId);
    if (authErr) {
      console.error("deleteCoachAccount: auth.admin.deleteUser failed:", authErr);
      return {
        error:
          "Dados removidos, mas falhou a remoção da conta de login no Supabase Auth. Remove manualmente em Authentication → Users.",
      };
    }
  }

  revalidatePath("/admin/coaches");
  revalidatePath("/admin/alunos");
  redirect("/admin/coaches");
}

export type ToggleCoursePermissionResult = { error?: string };

export async function toggleCoursePermission(
  _prev: ToggleCoursePermissionResult | null,
  formData: FormData
): Promise<ToggleCoursePermissionResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const studentId = (formData.get("studentId") as string)?.trim();
  const value = formData.get("value") === "true";
  if (!studentId) return { error: "ID inválido." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("Student").update({ can_create_courses: value }).eq("id", studentId);
  if (error) return { error: error.message };

  revalidatePath("/admin/coaches");
  return {};
}
