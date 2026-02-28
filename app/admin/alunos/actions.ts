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
  if (!email) return { error: "Email é obrigatório." };

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
  const planId = (formData.get("planId") as string)?.trim() || null;
  const primaryModality = (formData.get("primaryModality") as string)?.trim() || null;
  const validStatuses = ["ATIVO", "INATIVO", "EXPERIMENTAL"];
  const newStatus = status && validStatuses.includes(status) ? status : undefined;
  const newPrimaryModality = !primaryModality || primaryModality === "" ? null : primaryModality;

  const supabase = createAdminClient();

  const { data: student } = await supabase
    .from("Student")
    .select("id, userId")
    .eq("id", studentId)
    .single();

  if (!student) return { error: "Aluno não encontrado." };

  const updates: { status?: string; planId?: string | null; primaryModality?: string | null } = {};
  if (newStatus) updates.status = newStatus;
  updates.planId = planId === "" ? null : planId;
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
