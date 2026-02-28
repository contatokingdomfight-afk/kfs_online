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
  const modality = formData.get("modality") as string;
  const lessonDate = (formData.get("lessonDate") as string)?.trim();
  const lessonId = (formData.get("lessonId") as string)?.trim() || null;

  if (!name) return { error: "Nome é obrigatório." };
  if (!contact) return { error: "Contacto (email ou telefone) é obrigatório." };
  const validModalities = ["MUAY_THAI", "BOXING", "KICKBOXING"];
  if (!modality || !validModalities.includes(modality)) return { error: "Escolhe uma modalidade." };
  if (!lessonDate) return { error: "Data desejada é obrigatória." };

  const supabase = createAdminClient();
  const id = crypto.randomUUID();

  const { error } = await supabase.from("TrialClass").insert({
    id,
    name,
    contact,
    modality,
    lessonDate,
    lessonId: lessonId || null,
    convertedToStudent: false,
  });

  if (error) return { error: error.message };

  revalidatePath("/aula-experimental");
  redirect("/aula-experimental?sucesso=1");
}
