"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";

export type CreateStudentResult = { error?: string };

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

  const userId = crypto.randomUUID();
  const studentId = crypto.randomUUID();

  const { error: userError } = await supabase.from("User").insert({
    id: userId,
    authUserId: authUser.id,
    email: authUser.email ?? email,
    name: name ?? authUser.user_metadata?.full_name ?? null,
    role: "ALUNO",
  });

  if (userError) {
    return { error: userError.message };
  }

  const { error: studentError } = await supabase.from("Student").insert({
    id: studentId,
    userId,
    schoolId,
    status: "ATIVO",
  });

  if (studentError) {
    return { error: studentError.message };
  }

  revalidatePath("/admin/alunos");
  revalidatePath("/admin/alunos/novo");
  redirect("/admin/alunos");
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
  const validStatuses = ["ATIVO", "INATIVO", "EXPERIMENTAL"];
  const newStatus = status && validStatuses.includes(status) ? status : undefined;
  let newPrimaryModality = !primaryModality || primaryModality === "" ? null : primaryModality;

  const supabase = createAdminClient();

  if (schoolId) {
    const { data: school } = await supabase.from("School").select("id").eq("id", schoolId).eq("isActive", true).single();
    if (!school) return { error: "Escola inválida ou inativa." };
  }

  // Planos sem modalidade única: Presencial MMA = Todas; Kingdom Online = apenas digital (sem modalidade)
  let effectivePlanId: string | null = planId === "" ? null : planId;
  if (planId) {
    const { data: plan } = await supabase.from("Plan").select("name, schoolId").eq("id", planId).single();
    const planName = plan?.name ? String(plan.name) : "";
    if (planName.includes("Presencial MMA") || planName.includes("Kingdom Online")) {
      newPrimaryModality = null;
    }
    // Se mudou de escola e o plano é de outra escola, desatribuir plano
    if (schoolId && plan?.schoolId && plan.schoolId !== schoolId) {
      effectivePlanId = null;
    }
  }

  const { data: student } = await supabase
    .from("Student")
    .select("id, userId")
    .eq("id", studentId)
    .single();

  if (!student) return { error: "Aluno não encontrado." };

  const updates: { status?: string; schoolId?: string; planId?: string | null; primaryModality?: string | null } = {};
  if (newStatus) updates.status = newStatus;
  if (schoolId) updates.schoolId = schoolId;
  updates.planId = effectivePlanId;
  updates.primaryModality = newPrimaryModality;
  const { error: studentError } = await supabase.from("Student").update(updates).eq("id", studentId);
  if (studentError) return { error: studentError.message };

  if (name !== undefined) {
    const { error: userError } = await supabase.from("User").update({ name }).eq("id", student.userId);
    if (userError) return { error: userError.message };
  }

  revalidatePath("/admin/alunos");
  revalidatePath(`/admin/alunos/${student.id}`);
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
    .select("id, schoolId")
    .eq("id", studentId)
    .single();

  if (!student) return { error: "Aluno não encontrado." };

  const { data: fullPlan } = await supabase
    .from("Plan")
    .select("id")
    .eq("schoolId", student.schoolId)
    .eq("is_active", true)
    .eq("includes_digital_access", true)
    .eq("modality_scope", "ALL")
    .limit(1)
    .maybeSingle();

  if (!fullPlan) {
    return {
      error:
        "Nenhum plano com acesso total (plataforma + ginásio) encontrado para esta escola. Crie um plano com «Inclui plataforma digital» e «Todas as modalidades» em Admin → Planos.",
    };
  }

  const { error } = await supabase.from("Student").update({ planId: fullPlan.id }).eq("id", studentId);
  if (error) return { error: error.message };

  revalidatePath("/admin/alunos");
  revalidatePath(`/admin/alunos/${studentId}`);
  return { success: true };
}

export type PromoteStudentResult = { error?: string; success?: boolean };

/**
 * Promove o utilizador do aluno a Professor (COACH) ou Administrador (ADMIN).
 * Apenas ADMIN pode executar. Ao promover a Professor, cria o registo Coach e associa à escola do aluno.
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
  if (user.role !== "ALUNO") {
    return { error: "Só é possível promover utilizadores com perfil Aluno. Este utilizador já tem perfil " + user.role + "." };
  }

  const { error: userUpdateError } = await supabase
    .from("User")
    .update({ role: newRole })
    .eq("id", student.userId);

  if (userUpdateError) return { error: userUpdateError.message };

  if (newRole === "COACH") {
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
        schoolId: student.schoolId,
        studentId: student.id,
      });
      if (coachError) {
        await supabase.from("User").update({ role: "ALUNO" }).eq("id", student.userId);
        return { error: coachError.message };
      }
    }
  }

  revalidatePath("/admin/alunos");
  revalidatePath(`/admin/alunos/${studentId}`);
  revalidatePath("/admin/coaches");
  return { success: true };
}
