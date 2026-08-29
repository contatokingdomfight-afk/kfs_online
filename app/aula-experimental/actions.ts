"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { weekdayFromYmd } from "@/lib/lesson-occurrences";

export type SubmitTrialResult = { error?: string };

export async function submitTrialRequest(
  _prev: SubmitTrialResult | null,
  formData: FormData
): Promise<SubmitTrialResult> {
  const name = (formData.get("name") as string)?.trim();
  const contact = (formData.get("contact") as string)?.trim();
  const modality = (formData.get("modality") as string)?.trim();
  const schoolId = (formData.get("schoolId") as string)?.trim();
  const lessonSlot = (formData.get("lessonSlot") as string)?.trim() ?? "";

  if (!name) return { error: "Nome é obrigatório." };
  if (!contact) return { error: "Telefone é obrigatório." };
  if (!modality) return { error: "Escolhe uma modalidade." };
  if (!schoolId) return { error: "Escolhe o local / escola." };

  const slotParts = lessonSlot.split("::");
  const lessonId = slotParts[0]?.trim() ?? "";
  const occurrenceYmd = slotParts[1]?.trim() ?? "";
  if (!lessonId || !occurrenceYmd || !/^\d{4}-\d{2}-\d{2}$/.test(occurrenceYmd)) {
    return { error: "Escolhe a data e hora da aula." };
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return { error: "Configuração do servidor em falta. A inscrição não pôde ser guardada. Contacta a escola." };
  }

  const { data: lesson } = await supabase
    .from("Lesson")
    .select("id, date, modality, weekday, schoolId, isOneOff, offerTrialBooking, startTime")
    .eq("id", lessonId)
    .single();

  if (!lesson) return { error: "Aula selecionada não encontrada. Tenta novamente." };
  if ((lesson as { offerTrialBooking?: boolean }).offerTrialBooking === false) {
    return { error: "Esta aula já não está disponível para inscrição experimental. Escolhe outro horário." };
  }
  if ((lesson as { schoolId?: string }).schoolId !== schoolId) {
    return { error: "A aula não corresponde ao local escolhido." };
  }
  if ((lesson.modality ?? "") !== modality) return { error: "A aula não corresponde à modalidade escolhida." };

  const isOneOff = Boolean((lesson as { isOneOff?: boolean }).isOneOff);
  if (isOneOff) {
    const d = typeof lesson.date === "string" ? lesson.date.slice(0, 10) : "";
    if (d !== occurrenceYmd) return { error: "Data da aula inválida para esta inscrição." };
  } else {
    const wd = (lesson as { weekday?: number | null }).weekday;
    if (wd == null) return { error: "Esta aula não tem horário recorrente válido." };
    if (weekdayFromYmd(occurrenceYmd) !== wd) {
      return { error: "Data da aula inválida para esta inscrição." };
    }
  }

  const { data: cancelled } = await supabase
    .from("LessonCancellation")
    .select("id")
    .eq("lessonId", lessonId)
    .eq("date", occurrenceYmd)
    .maybeSingle();
  if (cancelled) return { error: "Esta data foi cancelada. Escolhe outra aula." };

  const id = crypto.randomUUID();
  const { error } = await supabase.from("TrialClass").insert({
    id,
    name,
    contact,
    modality,
    lessonDate: occurrenceYmd,
    lessonId,
    convertedToStudent: false,
  });

  if (error) return { error: error.message };

  revalidatePath("/aula-experimental");
  const startTime = (lesson as { startTime?: string | null }).startTime ?? "";
  const params = new URLSearchParams({ sucesso: "1", data: occurrenceYmd, hora: startTime });
  redirect(`/aula-experimental?${params.toString()}`);
}
