"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createLesson(formData: FormData) {
  const supabase = await createClient();

  const modality = (formData.get("modality") as string)?.trim() || null;
  const date = formData.get("date") as string | null;
  const startTime = formData.get("startTime") as string | null;
  const endTime = formData.get("endTime") as string | null;
  const coachId = (formData.get("coachId") as string) || null;
  const locationId = (formData.get("locationId") as string)?.trim() || null;
  const capacityStr = formData.get("capacity") as string | null;
  const planningNotes = (formData.get("planningNotes") as string) || null;

  if (!modality || !date || !startTime || !endTime) {
    return { error: "Preencha modalidade, data, hora início e hora fim." };
  }
  if (!coachId) {
    return { error: "Seleciona um coach para a aula." };
  }

  const capacity = capacityStr ? parseInt(capacityStr, 10) : null;
  if (capacityStr && (capacity === null || isNaN(capacity) || capacity < 1)) {
    return { error: "Capacidade deve ser um número positivo." };
  }

  const id = crypto.randomUUID();

  const { error } = await supabase.from("Lesson").insert({
    id,
    modality,
    date,
    startTime,
    endTime,
    coachId: coachId || null,
    locationId: locationId || null,
    capacity: capacity ?? null,
    planningNotes: planningNotes || null,
  });

  if (error) {
    console.error("createLesson error:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/turmas");
  revalidatePath("/admin");
  return { success: true };
}

export type UpdateLessonResult = { error?: string; success?: boolean };

export async function updateLesson(
  _prev: UpdateLessonResult | null,
  formData: FormData
): Promise<UpdateLessonResult> {
  const lessonId = (formData.get("lessonId") as string)?.trim();
  const modality = (formData.get("modality") as string)?.trim();
  const date = (formData.get("date") as string)?.trim();
  const startTime = (formData.get("startTime") as string)?.trim();
  const endTime = (formData.get("endTime") as string)?.trim();
  const coachId = (formData.get("coachId") as string)?.trim();
  const locationId = (formData.get("locationId") as string)?.trim() || null;
  const capacityStr = (formData.get("capacity") as string)?.trim() || null;
  const planningNotes = (formData.get("planningNotes") as string)?.trim() || null;

  if (!lessonId || !modality || !date || !startTime || !endTime) {
    return { error: "Preencha modalidade, data, hora início e hora fim." };
  }
  if (!coachId) return { error: "Coach é obrigatório." };

  const capacity = capacityStr ? parseInt(capacityStr, 10) : null;
  if (capacityStr && (capacity === null || isNaN(capacity) || capacity < 1)) {
    return { error: "Capacidade deve ser um número positivo." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("Lesson")
    .update({
      modality,
      date,
      startTime,
      endTime,
      coachId,
      locationId: locationId || null,
      capacity: capacity ?? null,
      planningNotes: planningNotes || null,
    })
    .eq("id", lessonId);

  if (error) return { error: error.message };

  revalidatePath("/admin/turmas");
  revalidatePath(`/admin/turmas/${lessonId}`);
  revalidatePath("/coach");
  revalidatePath("/coach/agenda");
  return { success: true };
}

export type DeleteLessonResult = { error?: string };

export async function deleteLesson(lessonId: string): Promise<DeleteLessonResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") {
    return { error: "Não autorizado." };
  }
  if (!lessonId?.trim()) {
    return { error: "ID da aula inválido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("Lesson").delete().eq("id", lessonId.trim());

  if (error) {
    console.error("deleteLesson error:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/turmas");
  revalidatePath("/admin/presenca");
  revalidatePath("/coach");
  revalidatePath("/coach/agenda");
  redirect("/admin/turmas");
}
