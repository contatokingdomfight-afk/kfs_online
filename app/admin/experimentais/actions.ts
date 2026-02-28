"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";

export type CreateTrialResult = { error?: string };

export async function createTrialClass(
  _prev: CreateTrialResult | null,
  formData: FormData
): Promise<CreateTrialResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const name = (formData.get("name") as string)?.trim();
  const contact = (formData.get("contact") as string)?.trim();
  const modality = formData.get("modality") as string;
  const lessonDate = (formData.get("lessonDate") as string)?.trim();
  const lessonId = (formData.get("lessonId") as string)?.trim() || null;

  if (!name) return { error: "Nome é obrigatório." };
  if (!contact) return { error: "Contacto é obrigatório." };
  const validModalities = ["MUAY_THAI", "BOXING", "KICKBOXING"];
  if (!modality || !validModalities.includes(modality)) return { error: "Modalidade inválida." };
  if (!lessonDate) return { error: "Data da aula é obrigatória." };

  const supabase = createAdminClient();
  const id = crypto.randomUUID();

  const { error } = await supabase.from("TrialClass").insert({
    id,
    name,
    contact,
    modality,
    lessonDate: lessonDate,
    lessonId: lessonId || null,
    convertedToStudent: false,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/experimentais");
  revalidatePath("/admin/experimentais/novo");
  redirect("/admin/experimentais");
}

export type ConvertTrialResult = { error?: string };

export async function convertTrialToStudent(
  _prev: ConvertTrialResult | null,
  formData: FormData
): Promise<ConvertTrialResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const trialId = (formData.get("trialId") as string)?.trim();
  if (!trialId) return { error: "Inscrição inválida." };

  const supabase = createAdminClient();

  const { data: trial } = await supabase.from("TrialClass").select("id, name, contact, convertedToStudent").eq("id", trialId).single();
  if (!trial) return { error: "Inscrição não encontrada." };
  if (trial.convertedToStudent) return { error: "Já foi convertida em aluno." };

  const email = trial.contact.trim();
  if (!email.includes("@")) return { error: "O contacto não é um email. Adiciona o aluno manualmente em Alunos." };

  const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { full_name: trial.name || undefined },
  });

  if (inviteError) {
    if (inviteError.message.includes("already been registered")) {
      return { error: "Já existe utilizador com este email. Marca como convertido manualmente ou associa o aluno em Atletas." };
    }
    return { error: inviteError.message };
  }

  const authUser = inviteData?.user;
  if (!authUser?.id) {
    return { error: "Convite enviado, mas não foi possível criar o registo. O aluno pode fazer login e ficará como aluno." };
  }

  const userId = crypto.randomUUID();
  const studentId = crypto.randomUUID();

  const { error: userError } = await supabase.from("User").insert({
    id: userId,
    authUserId: authUser.id,
    email: authUser.email ?? email,
    name: (trial.name || authUser.user_metadata?.full_name) ?? null,
    role: "ALUNO",
  });
  if (userError) return { error: userError.message };

  const { error: studentError } = await supabase.from("Student").insert({
    id: studentId,
    userId,
    status: "ATIVO",
  });
  if (studentError) return { error: studentError.message };

  const { error: updateError } = await supabase.from("TrialClass").update({ convertedToStudent: true }).eq("id", trialId);
  if (updateError) return { error: updateError.message };

  revalidatePath("/admin/experimentais");
  revalidatePath("/admin/alunos");
  redirect("/admin/experimentais");
}
