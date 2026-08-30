"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureOnboardingPendingPayments } from "@/lib/ensure-onboarding-pending-payments";
import { planRequiresPrimaryModality } from "@/lib/plan-primary-modality";
import { resolveEffectiveAccessPlan } from "@/lib/family-effective-plan";
import { KINGDOM_PLAN_FAMILIA_ID, isFamilyPlan } from "@/lib/kingdom-plans-constants";
import {
  assignFamilyPlanToStudent,
  ensureFamilyGroupAsTitular,
  getFamilyContext,
} from "@/lib/family-group";
import { stripe } from "@/lib/stripe/server";
import { createConfirmedAuthUser, generateInitialPassword } from "@/lib/admin-create-auth-user";
import {
  generateUniqueSyntheticEmail,
  isSyntheticStudentEmail,
} from "@/lib/student-synthetic-email";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CreateStudentResult = { error?: string };

export type CreateStudentPresencialResult = {
  error?: string;
  success?: boolean;
  studentId?: string;
  loginEmail?: string;
  initialPassword?: string;
  syntheticLoginEmail?: boolean;
};

async function insertStudentWithProfile(
  supabase: SupabaseClient,
  params: {
    authUserId: string;
    email: string;
    name: string | null;
    schoolId: string;
    registrationMode: "INVITE" | "PRESENTIAL";
    syntheticLoginEmail: boolean;
    dateOfBirth?: string | null;
    guardianPhone?: string | null;
    guardianName?: string | null;
  }
): Promise<{ studentId: string } | { error: string }> {
  const userId = crypto.randomUUID();
  const studentId = crypto.randomUUID();

  const { error: userError } = await supabase.from("User").insert({
    id: userId,
    authUserId: params.authUserId,
    email: params.email,
    name: params.name,
    role: "ALUNO",
  });

  if (userError) {
    return { error: userError.message };
  }

  const { error: studentError } = await supabase.from("Student").insert({
    id: studentId,
    userId,
    schoolId: params.schoolId,
    status: "ATIVO",
    registrationMode: params.registrationMode,
    syntheticLoginEmail: params.syntheticLoginEmail,
  });

  if (studentError) {
    return { error: studentError.message };
  }

  const emergencyContact =
    params.guardianName && params.guardianPhone
      ? `${params.guardianName} — ${params.guardianPhone}`
      : params.guardianPhone ?? params.guardianName ?? null;

  const { error: profileError } = await supabase.from("StudentProfile").insert({
    studentId,
    hasCompletedOnboarding: true,
    dateOfBirth: params.dateOfBirth ?? null,
    phone: params.guardianPhone ?? null,
    emergencyContact,
  });

  if (profileError) {
    return { error: profileError.message };
  }

  return { studentId };
}

export async function createStudent(
  _prev: CreateStudentResult | null,
  formData: FormData
): Promise<CreateStudentResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const email = (formData.get("email") as string)?.trim();
  const name = (formData.get("name") as string)?.trim() || null;
  const schoolId = (formData.get("schoolId") as string)?.trim();

  if (!email) return { error: "Email é obrigatório." };
  if (!schoolId) return { error: "Escola é obrigatória." };

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
    return { error: "Convite enviado, mas não foi possível criar o registo local. O aluno pode fazer login e o perfil será criado." };
  }

  const inserted = await insertStudentWithProfile(supabase, {
    authUserId: authUser.id,
    email: authUser.email ?? email,
    name: name ?? authUser.user_metadata?.full_name ?? null,
    schoolId,
    registrationMode: "INVITE",
    syntheticLoginEmail: false,
  });

  if ("error" in inserted) {
    return { error: inserted.error };
  }

  revalidatePath("/admin/alunos");
  revalidatePath("/admin/alunos/novo");
  redirect("/admin/alunos");
}

/** Cadastro presencial: secretaria define senha inicial; sem enviar convite por email. */
export async function createStudentPresencial(
  _prev: CreateStudentPresencialResult | null,
  formData: FormData
): Promise<CreateStudentPresencialResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const name = (formData.get("name") as string)?.trim();
  const schoolId = (formData.get("schoolId") as string)?.trim();
  const isMinor = formData.get("isMinor") === "on" || formData.get("isMinor") === "true";
  const emailInput = (formData.get("email") as string)?.trim().toLowerCase() || "";
  const passwordInput = (formData.get("password") as string)?.trim() || "";
  const autoGeneratePassword = formData.get("autoGeneratePassword") === "on" || formData.get("autoGeneratePassword") === "true";
  const dateOfBirth = (formData.get("dateOfBirth") as string)?.trim() || null;
  const guardianName = (formData.get("guardianName") as string)?.trim() || null;
  const guardianPhone = (formData.get("guardianPhone") as string)?.trim() || null;

  if (!name || name.length < 2) return { error: "Indica o nome completo do aluno." };
  if (!schoolId) return { error: "Escola é obrigatória." };

  if (isMinor) {
    if (!dateOfBirth) return { error: "Indica a data de nascimento do menor." };
    if (!guardianName || guardianName.length < 3) return { error: "Indica o nome do responsável legal." };
    if (!guardianPhone || guardianPhone.length < 6) return { error: "Indica o telefone do responsável." };
  } else if (!emailInput) {
    return { error: "Email é obrigatório para adultos." };
  }

  const supabase = createAdminClient();

  const { data: school } = await supabase.from("School").select("id").eq("id", schoolId).eq("isActive", true).single();
  if (!school) return { error: "Escola inválida ou inativa." };

  let loginEmail = emailInput;
  let syntheticLoginEmail = false;

  if (isMinor) {
    try {
      loginEmail = await generateUniqueSyntheticEmail(supabase, name);
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Erro ao gerar email interno." };
    }
    syntheticLoginEmail = true;
  } else {
    syntheticLoginEmail = isSyntheticStudentEmail(loginEmail);
  }

  const initialPassword = autoGeneratePassword || !passwordInput ? generateInitialPassword(10) : passwordInput;

  const authResult = await createConfirmedAuthUser(supabase, {
    email: loginEmail,
    password: initialPassword,
    name,
  });

  if ("error" in authResult) {
    return { error: authResult.error };
  }

  const inserted = await insertStudentWithProfile(supabase, {
    authUserId: authResult.authUserId,
    email: authResult.email,
    name,
    schoolId,
    registrationMode: "PRESENTIAL",
    syntheticLoginEmail,
    dateOfBirth: isMinor ? dateOfBirth : null,
    guardianPhone: isMinor ? guardianPhone : null,
    guardianName: isMinor ? guardianName : null,
  });

  if ("error" in inserted) {
    return { error: inserted.error };
  }

  revalidatePath("/admin/alunos");
  revalidatePath("/admin/alunos/novo");

  return {
    success: true,
    studentId: inserted.studentId,
    loginEmail: authResult.email,
    initialPassword,
    syntheticLoginEmail,
  };
}

export type UpdateStudentResult = { error?: string; success?: boolean };

export async function updateStudent(
  _prev: UpdateStudentResult | null,
  formData: FormData
): Promise<UpdateStudentResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const studentId = (formData.get("studentId") as string)?.trim();
  if (!studentId) return { error: "ID do aluno inválido." };

  const name = (formData.get("name") as string)?.trim() || null;
  const status = formData.get("status") as string | null;
  const schoolId = (formData.get("schoolId") as string)?.trim() || null;
  const planId = (formData.get("planId") as string)?.trim() || null;
  const primaryModality = (formData.get("primaryModality") as string)?.trim() || null;
  const validStatuses = ["ATIVO", "INADIMPLENTE", "INATIVO", "EXPERIMENTAL"];
  const newStatus = status && validStatuses.includes(status) ? status : undefined;
  let newPrimaryModality = !primaryModality || primaryModality === "" ? null : primaryModality;

  const supabase = createAdminClient();

  if (schoolId) {
    const { data: school } = await supabase.from("School").select("id").eq("id", schoolId).eq("isActive", true).single();
    if (!school) return { error: "Escola inválida ou inativa." };
  }

  // Só `modalityScope === "SINGLE"` (Presencial I / Fighter) mantém modalidade principal; ALL/NONE limpam.
  // No plano família, usa o plano de referência individual de cada membro.
  let effectivePlanId: string | null = planId === "" ? null : planId;
  let planNameForFamily: string | null = null;
  if (planId) {
    const { data: plan } = await supabase
      .from("Plan")
      .select("name, schoolId, modalityScope")
      .eq("id", planId)
      .single();
    planNameForFamily = (plan as { name?: string } | null)?.name ?? null;
    if (isFamilyPlan(planId, planNameForFamily)) {
      effectivePlanId = KINGDOM_PLAN_FAMILIA_ID;
    }
  }

  const { data: student } = await supabase
    .from("Student")
    .select("id, userId, planId, schoolId")
    .eq("id", studentId)
    .single();

  if (!student) return { error: "Aluno não encontrado." };

  const subscriptionPlanId = effectivePlanId ?? (student as { planId?: string | null }).planId ?? null;
  const accessPlan = subscriptionPlanId
    ? await resolveEffectiveAccessPlan(supabase, studentId, subscriptionPlanId)
    : null;
  if (!planRequiresPrimaryModality(accessPlan?.modalityScope, accessPlan?.id, accessPlan?.name)) {
    newPrimaryModality = null;
  } else if (!newPrimaryModality) {
    return { error: "Escolhe a modalidade principal deste aluno." };
  }

  const previousPlanId = (student as { planId?: string | null }).planId ?? null;
  const planChanged = previousPlanId !== effectivePlanId;

  let onFamilyPlan = effectivePlanId === KINGDOM_PLAN_FAMILIA_ID;
  if (!onFamilyPlan && previousPlanId) {
    const { data: prevPlan } = await supabase
      .from("Plan")
      .select("id, name")
      .eq("id", previousPlanId)
      .maybeSingle();
    onFamilyPlan = isFamilyPlan(prevPlan?.id ?? previousPlanId, prevPlan?.name);
    if (onFamilyPlan && !planId) {
      effectivePlanId = KINGDOM_PLAN_FAMILIA_ID;
    }
  }

  /** Só (re)garante o grupo/membership quando o plano está mesmo a mudar para família —
   * repetir isto em toda gravação de um titular já existente arrisca colidir com uma
   * membership antiga (ex.: grupo desactivado). */
  const becomingFamilyPlan = onFamilyPlan && planChanged;

  if (becomingFamilyPlan) {
    const familyCtx = await getFamilyContext(supabase, studentId);
    if (familyCtx && !familyCtx.isTitular) {
      return { error: "Este aluno é membro de outro grupo familiar. Remove-o do grupo antes de atribuir como titular." };
    }
    if (!familyCtx) {
      const effectiveSchoolId = schoolId || (student as { schoolId?: string | null }).schoolId;
      const ensured = await ensureFamilyGroupAsTitular(supabase, studentId, {
        schoolId: effectiveSchoolId ?? undefined,
      });
      if (ensured.error) return { error: ensured.error };
    }
  }

  const updates: {
    status?: string;
    statusChangedAt?: string;
    schoolId?: string;
    planId?: string | null;
    primaryModality?: string | null;
    adminGrantedFullAccess?: boolean;
  } = {};
  if (newStatus) {
    updates.status = newStatus;
    updates.statusChangedAt = new Date().toISOString();
  }
  if (schoolId) updates.schoolId = schoolId;
  updates.planId = effectivePlanId;
  updates.primaryModality = newPrimaryModality;
  if (planChanged) updates.adminGrantedFullAccess = false;

  const { error: studentError } = await supabase.from("Student").update(updates).eq("id", studentId);
  if (studentError) return { error: studentError.message };

  if (becomingFamilyPlan) {
    const planResult = await assignFamilyPlanToStudent(supabase, studentId, "TITULAR");
    if (planResult.error) return { error: planResult.error };
  } else if (effectivePlanId && !previousPlanId) {
    const pending = await ensureOnboardingPendingPayments(supabase, studentId, effectivePlanId);
    if (pending.error) return { error: pending.error };
  }

  if (name !== undefined) {
    const { error: userError } = await supabase.from("User").update({ name }).eq("id", student.userId);
    if (userError) return { error: userError.message };
  }

  revalidatePath("/admin/alunos");
  revalidatePath(`/admin/alunos/${student.id}`);
  revalidatePath(`/coach/alunos/${student.id}`);
  revalidatePath(`/coach/alunos/${student.id}/inscricao`);
  revalidatePath("/admin/financeiro");
  revalidatePath("/admin/familias");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/financeiro");
  return { success: true };
}

export type SetFullAccessResult = { error?: string; success?: boolean };

/** Atribui ao aluno um plano com acesso total (plataforma digital + todas as modalidades). */
export async function setStudentFullAccess(
  _prev: SetFullAccessResult | null,
  formData: FormData
): Promise<SetFullAccessResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const studentId = (formData.get("studentId") as string)?.trim();
  if (!studentId) return { error: "ID do aluno inválido." };

  const supabase = createAdminClient();

  const { data: student } = await supabase
    .from("Student")
    .select("id, schoolId, stripeSubscriptionId")
    .eq("id", studentId)
    .single();

  if (!student) return { error: "Aluno não encontrado." };

  // Cancela subscrição Stripe se existir (acesso gratuito = sem cobranças)
  const subId = (student as { stripeSubscriptionId?: string | null }).stripeSubscriptionId;
  if (subId && stripe) {
    try {
      await stripe.subscriptions.cancel(subId);
    } catch (e) {
      console.warn("Stripe subscription cancel failed:", e);
      // Continua: atribui o plano na mesma
    }
  }

  // Preferir plano FULL na escola do aluno; se não existir, usar qualquer plano ativo equivalente (catálogo partilhado).
  let fullPlan: { id: string } | null = null;
  const { data: fullPlanForSchool } = await supabase
    .from("Plan")
    .select("id")
    .eq("schoolId", student.schoolId)
    .eq("isActive", true)
    .eq("includesDigitalAccess", true)
    .eq("modalityScope", "ALL")
    .order("priceMonthly", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fullPlanForSchool) {
    fullPlan = fullPlanForSchool;
  } else {
    const { data: fullPlanAny } = await supabase
      .from("Plan")
      .select("id")
      .eq("isActive", true)
      .eq("includesDigitalAccess", true)
      .eq("modalityScope", "ALL")
      .order("priceMonthly", { ascending: false })
      .limit(1)
      .maybeSingle();
    fullPlan = fullPlanAny ?? null;
  }

  if (!fullPlan) {
    return {
      error:
        "Nenhum plano com acesso total encontrado. Crie pelo menos um plano ativo com «Inclui plataforma digital» e «Todas as modalidades» em Admin → Planos.",
    };
  }

  // Atribui o melhor plano (acesso gratuito, sem cobranças)
  const { error } = await supabase
    .from("Student")
    .update({
      planId: fullPlan.id,
      stripeSubscriptionId: null,
      adminGrantedFullAccess: true,
      paymentSuspendedAt: null,
      suspendedPlanId: null,
      status: "ATIVO",
      statusChangedAt: new Date().toISOString(),
    })
    .eq("id", studentId);
  if (error) return { error: error.message };

  revalidatePath("/admin/alunos");
  revalidatePath(`/admin/alunos/${studentId}`);
  revalidatePath(`/coach/alunos/${studentId}`);
  revalidatePath(`/coach/alunos/${studentId}/inscricao`);
  return { success: true };
}

export type ClearStudentPlanResult = { error?: string; success?: boolean };

/** Remove o plano do aluno (deixa de ter acesso via plano). Cancela subscrição Stripe se existir. */
export async function clearStudentPlanAccess(
  _prev: ClearStudentPlanResult | null,
  formData: FormData
): Promise<ClearStudentPlanResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const studentId = (formData.get("studentId") as string)?.trim();
  if (!studentId) return { error: "ID do aluno inválido." };

  const supabase = createAdminClient();

  const { data: student } = await supabase
    .from("Student")
    .select("id, stripeSubscriptionId, planId, digitalLibraryAddonSubscriptionId")
    .eq("id", studentId)
    .single();

  if (!student) return { error: "Aluno não encontrado." };
  if (!(student as { planId?: string | null }).planId) {
    return { error: "Este aluno já não tem plano atribuído." };
  }

  const subId = (student as { stripeSubscriptionId?: string | null }).stripeSubscriptionId;
  const addOnSub = (student as { digitalLibraryAddonSubscriptionId?: string | null }).digitalLibraryAddonSubscriptionId;
  if (addOnSub && stripe) {
    try {
      await stripe.subscriptions.cancel(addOnSub);
    } catch (e) {
      console.warn("Stripe add-on library subscription cancel failed:", e);
    }
  }
  if (subId && stripe) {
    try {
      await stripe.subscriptions.cancel(subId);
    } catch (e) {
      console.warn("Stripe subscription cancel failed:", e);
    }
  }

  const { error } = await supabase
    .from("Student")
    .update({
      planId: null,
      stripeSubscriptionId: null,
      adminGrantedFullAccess: false,
      digitalLibraryAddon: false,
      digitalLibraryAddonSubscriptionId: null,
    })
    .eq("id", studentId);
  if (error) return { error: error.message };

  revalidatePath("/admin/alunos");
  revalidatePath(`/admin/alunos/${studentId}`);
  revalidatePath(`/coach/alunos/${studentId}`);
  revalidatePath(`/coach/alunos/${studentId}/inscricao`);
  return { success: true };
}

export type PromoteStudentResult = { error?: string; success?: boolean };

/**
 * Define o papel do utilizador ligado ao aluno como Professor (COACH) ou Administrador (ADMIN).
 * Apenas ADMIN pode executar. Funciona para qualquer papel atual (ALUNO, COACH ou ADMIN):
 * no-op se já for o papel pedido; cria Coach + CoachSchool se passar a COACH/ADMIN e ainda não existir.
 */
export async function promoteStudentToRole(
  _prev: PromoteStudentResult | null,
  formData: FormData
): Promise<PromoteStudentResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const studentId = (formData.get("studentId") as string)?.trim();
  const newRole = formData.get("newRole") as string | null;
  if (!studentId || (newRole !== "COACH" && newRole !== "ADMIN")) {
    return { error: "Parâmetros inválidos." };
  }

  const supabase = createAdminClient();

  const { data: student } = await supabase
    .from("Student")
    .select("id, userId, schoolId")
    .eq("id", studentId)
    .single();

  if (!student) return { error: "Aluno não encontrado." };

  const { data: user } = await supabase
    .from("User")
    .select("id, role")
    .eq("id", student.userId)
    .single();

  if (!user) return { error: "Utilizador não encontrado." };

  const currentRole = user.role as string;

  if (currentRole === newRole) {
    revalidatePath("/admin/alunos");
    revalidatePath(`/admin/alunos/${studentId}`);
    revalidatePath(`/coach/alunos/${studentId}`);
    revalidatePath(`/coach/alunos/${studentId}/inscricao`);
    revalidatePath("/admin/coaches");
    return { success: true };
  }

  const { error: userUpdateError } = await supabase
    .from("User")
    .update({ role: newRole })
    .eq("id", student.userId);

  if (userUpdateError) return { error: userUpdateError.message };

  if (newRole === "COACH" || newRole === "ADMIN") {
    const { data: existingCoach } = await supabase
      .from("Coach")
      .select("id")
      .eq("userId", student.userId)
      .maybeSingle();

    if (!existingCoach) {
      const coachId = crypto.randomUUID();
      const { error: coachError } = await supabase.from("Coach").insert({
        id: coachId,
        userId: student.userId,
        studentId: student.id,
      });
      if (coachError) {
        await supabase.from("User").update({ role: currentRole }).eq("id", student.userId);
        return { error: coachError.message };
      }
      const { error: csErr } = await supabase.from("CoachSchool").insert({
        coachId,
        schoolId: student.schoolId,
      });
      if (csErr) {
        await supabase.from("Coach").delete().eq("id", coachId);
        await supabase.from("User").update({ role: currentRole }).eq("id", student.userId);
        return { error: csErr.message };
      }
    }
  }

  revalidatePath("/admin/alunos");
  revalidatePath(`/admin/alunos/${studentId}`);
  revalidatePath(`/coach/alunos/${studentId}`);
  revalidatePath(`/coach/alunos/${studentId}/inscricao`);
  revalidatePath("/admin/coaches");
  return { success: true };
}

export type DeleteStudentResult = { error?: string };

/**
 * Remove o aluno, dados associados, registo User e conta Supabase Auth.
 * Só para utilizadores com role ALUNO. Não remove cursos onde o aluno é criador principal.
 */
export async function deleteStudent(
  _prev: DeleteStudentResult | null,
  formData: FormData
): Promise<DeleteStudentResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const studentId = (formData.get("studentId") as string)?.trim();
  if (!studentId) return { error: "ID do aluno inválido." };

  const supabase = createAdminClient();

  const { data: student } = await supabase
    .from("Student")
    .select("id, userId, stripeSubscriptionId")
    .eq("id", studentId)
    .single();

  if (!student) return { error: "Aluno não encontrado." };

  if (dbUser.id === student.userId) {
    return { error: "Não podes eliminar a tua própria conta neste ecrã." };
  }

  const { data: user } = await supabase
    .from("User")
    .select("id, role, authUserId")
    .eq("id", student.userId)
    .single();

  if (!user) return { error: "Utilizador não encontrado." };
  if (user.role !== "ALUNO") {
    return {
      error:
        "Este utilizador já não é só aluno (Professor ou Admin). Gere o perfil em Coaches ou altera o papel antes de eliminar.",
    };
  }

  const { count: courseCreatorCount } = await supabase
    .from("Course")
    .select("id", { count: "exact", head: true })
    .eq("creator_student_id", studentId);

  if (courseCreatorCount && courseCreatorCount > 0) {
    return {
      error:
        "Este aluno é criador principal de um ou mais cursos. Transfere a propriedade ou remove os cursos em Admin → Cursos antes de eliminar.",
    };
  }

  const subId = (student as { stripeSubscriptionId?: string | null }).stripeSubscriptionId;
  if (subId && stripe) {
    try {
      await stripe.subscriptions.cancel(subId);
    } catch (e) {
      console.warn("Stripe subscription cancel before student delete:", e);
    }
  }

  await supabase.from("Coach").update({ studentId: null }).eq("studentId", studentId);

  const { data: athlete } = await supabase.from("Athlete").select("id").eq("studentId", studentId).maybeSingle();
  if (athlete?.id) {
    const aid = athlete.id;
    await supabase.from("Comment").delete().eq("targetType", "ATHLETE").eq("targetId", aid);
    await supabase.from("AthleteEvaluation").delete().eq("athleteId", aid);
    await supabase.from("AthleteMissionCompletion").delete().eq("athleteId", aid);
    await supabase.from("AthleteMissionAward").delete().eq("athleteId", aid);
    await supabase.from("Athlete").delete().eq("id", aid);
  }

  await supabase.from("Attendance").delete().eq("studentId", studentId);
  await supabase.from("Payment").delete().eq("studentId", studentId);
  await supabase.from("StudentPhysicalAssessment").delete().eq("studentId", studentId);
  await supabase.from("Notification").delete().eq("studentId", studentId);
  await supabase.from("StudentBadge").delete().eq("studentId", studentId);
  await supabase.from("StudentProfile").delete().eq("studentId", studentId);
  await supabase.from("CoursePurchase").delete().eq("studentId", studentId);
  await supabase.from("CourseProgress").delete().eq("student_id", studentId);
  await supabase.from("CourseUnitProgress").delete().eq("student_id", studentId);
  await supabase.from("EventRegistration").delete().eq("studentId", studentId);
  await supabase.from("CourseCreator").delete().eq("student_id", studentId);

  const { error: delStudentErr } = await supabase.from("Student").delete().eq("id", studentId);
  if (delStudentErr) return { error: delStudentErr.message };

  const { error: delUserErr } = await supabase.from("User").delete().eq("id", student.userId);
  if (delUserErr) return { error: delUserErr.message };

  const authId = user.authUserId as string | undefined;
  if (authId) {
    const { error: authErr } = await supabase.auth.admin.deleteUser(authId);
    if (authErr) {
      console.error("deleteStudent: auth.admin.deleteUser failed:", authErr);
      return {
        error:
          "Dados do aluno removidos, mas falhou a remoção da conta de login no Supabase Auth. Remove manualmente em Authentication → Users.",
      };
    }
  }

  revalidatePath("/admin/alunos");
  revalidatePath("/admin/atletas");
  revalidatePath("/admin/financeiro");
  redirect("/admin/alunos");
}
