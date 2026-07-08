"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentCoachId } from "@/lib/auth/get-current-coach";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getLessonIdsForCoach } from "@/lib/coach-lesson-ids";
import {
  extractEmailFromContact,
  sendTrialAcceptanceConfirmation,
} from "@/lib/notifications/email";

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
  const validModalities = ["MUAY_THAI", "BOXING", "KICKBOXING", "MMA"];
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

export type AcceptTrialResult = { error?: string };

export async function acceptTrialRequest(
  _prev: AcceptTrialResult | null,
  formData: FormData
): Promise<AcceptTrialResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || (dbUser.role !== "ADMIN" && dbUser.role !== "COACH")) return { error: "Não autorizado." };

  const trialId = (formData.get("trialId") as string)?.trim();
  if (!trialId) return { error: "Inscrição inválida." };

  const supabase = createAdminClient();

  const { data: trial } = await supabase
    .from("TrialClass")
    .select("id, name, contact, modality, acceptedAt, convertedToStudent, lessonId, lessonDate")
    .eq("id", trialId)
    .single();
  if (!trial) return { error: "Inscrição não encontrada." };
  if (trial.convertedToStudent) return { error: "Já foi convertida em aluno." };
  if (trial.acceptedAt) return { error: "Pedido já foi aceite." };

  if (dbUser.role === "COACH") {
    const lessonId = trial.lessonId as string | null;
    if (!lessonId) return { error: "Inscrição sem aula atribuída. Contacta a administração." };
    const coachId = await getCurrentCoachId();
    if (!coachId) return { error: "Perfil de coach não encontrado." };
    const coachSupabase = await createClient();
    const allowed = await getLessonIdsForCoach(coachSupabase, coachId);
    if (!allowed.has(lessonId)) return { error: "Sem permissão para gerir esta inscrição." };
  }

  const { error: updateError } = await supabase
    .from("TrialClass")
    .update({ acceptedAt: new Date().toISOString() })
    .eq("id", trialId);

  if (updateError) return { error: updateError.message };

  const recipientEmail = extractEmailFromContact(String(trial.contact ?? ""));
  if (recipientEmail) {
    const lessonDate = String(trial.lessonDate).slice(0, 10);
    let startTime: string | null = null;
    let endTime: string | null = null;
    let schoolName: string | null = null;
    let locationName: string | null = null;

    const lessonId = trial.lessonId as string | null;
    if (lessonId) {
      const { data: lesson } = await supabase
        .from("Lesson")
        .select("startTime, endTime, schoolId, locationId")
        .eq("id", lessonId)
        .maybeSingle();
      if (lesson) {
        startTime = (lesson as { startTime?: string }).startTime ?? null;
        endTime = (lesson as { endTime?: string }).endTime ?? null;
        const schoolId = (lesson as { schoolId?: string }).schoolId;
        const locationId = (lesson as { locationId?: string | null }).locationId;
        if (schoolId) {
          const { data: school } = await supabase.from("School").select("name").eq("id", schoolId).maybeSingle();
          schoolName = (school as { name?: string } | null)?.name ?? null;
        }
        if (locationId) {
          const { data: location } = await supabase.from("Location").select("name").eq("id", locationId).maybeSingle();
          locationName = (location as { name?: string } | null)?.name ?? null;
        }
      }
    }

    const emailResult = await sendTrialAcceptanceConfirmation(recipientEmail, (trial.name as string) ?? null, {
      modality: String(trial.modality ?? ""),
      date: lessonDate,
      startTime,
      endTime,
      schoolName,
      locationName,
    });
    if (emailResult.error) {
      console.error("acceptTrialRequest: email não enviado:", emailResult.error);
    }
  }

  revalidatePath("/admin/experimentais");
  revalidatePath("/coach/aula");
  revalidatePath("/coach/experimentais");
  revalidatePath("/coach");

  if (dbUser.role === "ADMIN") {
    redirect("/admin/experimentais");
  }
  const lid = trial.lessonId as string;
  const d = String(trial.lessonDate).slice(0, 10);
  redirect(`/coach/aula?lesson=${encodeURIComponent(lid)}&date=${encodeURIComponent(d)}`);
}

export type ConvertTrialResult = { error?: string };

export async function convertTrialToStudent(
  _prev: ConvertTrialResult | null,
  formData: FormData
): Promise<ConvertTrialResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || (dbUser.role !== "ADMIN" && dbUser.role !== "COACH")) return { error: "Não autorizado." };

  const trialId = (formData.get("trialId") as string)?.trim();
  if (!trialId) return { error: "Inscrição inválida." };

  const supabase = createAdminClient();

  const { data: trial } = await supabase
    .from("TrialClass")
    .select("id, name, contact, convertedToStudent, lessonId, lessonDate")
    .eq("id", trialId)
    .single();
  if (!trial) return { error: "Inscrição não encontrada." };
  if (trial.convertedToStudent) return { error: "Já foi convertida em aluno." };

  if (dbUser.role === "COACH") {
    const lessonId = trial.lessonId as string | null;
    if (!lessonId) return { error: "Inscrição sem aula atribuída. Contacta a administração." };
    const coachId = await getCurrentCoachId();
    if (!coachId) return { error: "Perfil de coach não encontrado." };
    const coachSupabase = await createClient();
    const allowed = await getLessonIdsForCoach(coachSupabase, coachId);
    if (!allowed.has(lessonId)) return { error: "Sem permissão para gerir esta inscrição." };
  }

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

  const lessonId = trial.lessonId as string | null;
  let schoolId: string | null = null;
  if (lessonId) {
    const { data: lesson } = await supabase.from("Lesson").select("schoolId").eq("id", lessonId).maybeSingle();
    schoolId = (lesson as { schoolId?: string } | null)?.schoolId ?? null;
  }
  if (!schoolId) {
    const { data: defaultSchool, error: schoolErr } = await supabase
      .from("School")
      .select("id")
      .eq("isActive", true)
      .order("createdAt", { ascending: true })
      .limit(1)
      .single();
    if (schoolErr || !defaultSchool) {
      return { error: "Nenhuma escola ativa encontrada. Configure uma escola primeiro." };
    }
    schoolId = defaultSchool.id;
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
    schoolId,
    status: "ATIVO",
  });
  if (studentError) return { error: studentError.message };

  const { error: updateError } = await supabase.from("TrialClass").update({ convertedToStudent: true }).eq("id", trialId);
  if (updateError) return { error: updateError.message };

  revalidatePath("/admin/experimentais");
  revalidatePath("/admin/alunos");
  revalidatePath("/coach/aula");
  revalidatePath("/coach/experimentais");
  revalidatePath("/coach");

  if (dbUser.role === "ADMIN") {
    redirect("/admin/experimentais");
  }
  const lid = trial.lessonId as string | null;
  if (lid) {
    const d = String(trial.lessonDate).slice(0, 10);
    redirect(`/coach/aula?lesson=${encodeURIComponent(lid)}&date=${encodeURIComponent(d)}`);
  }
  redirect("/coach/experimentais");
}
