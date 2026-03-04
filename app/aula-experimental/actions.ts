"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export type SubmitTrialResult = { error?: string };

export async function submitTrialRequest(
  _prev: SubmitTrialResult | null,
  formData: FormData
): Promise<SubmitTrialResult> {
  const name = (formData.get("name") as string)?.trim();
  const contact = (formData.get("contact") as string)?.trim();
  const modality = (formData.get("modality") as string)?.trim();
  const lessonId = (formData.get("lessonId") as string)?.trim() || null;

  if (!name) return { error: "Nome é obrigatório." };
  if (!contact) return { error: "Contacto (email ou telefone) é obrigatório." };
  if (!modality) return { error: "Escolhe uma modalidade." };
  if (!lessonId) return { error: "Escolhe a data e hora desejada." };

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return { error: "Configuração do servidor em falta. A inscrição não pôde ser guardada. Contacta a escola." };
  }

  const { data: lesson } = await supabase
    .from("Lesson")
    .select("id, date, modality")
    .eq("id", lessonId)
    .single();

  if (!lesson) return { error: "Aula selecionada não encontrada. Tenta novamente." };
  if ((lesson.modality ?? "") !== modality) return { error: "A aula não corresponde à modalidade escolhida." };

  const lessonDate = lesson.date;

  const id = crypto.randomUUID();
  const { error } = await supabase.from("TrialClass").insert({
    id,
    name,
    contact,
    modality,
    lessonDate,
    lessonId,
    convertedToStudent: false,
  });

  if (error) return { error: error.message };

  revalidatePath("/aula-experimental");
  redirect("/aula-experimental?sucesso=1");
}
