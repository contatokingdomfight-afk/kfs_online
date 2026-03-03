"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { revalidatePath } from "next/cache";

const RECURRING_WEEKS = 12; // ao criar aula recorrente, criar as próximas N semanas

export async function createLesson(formData: FormData) {
  const supabase = await createClient();

  const modality = (formData.get("modality") as string)?.trim() || null;
  const date = formData.get("date") as string | null;
  const startTime = formData.get("startTime") as string | null;
  const endTime = formData.get("endTime") as string | null;
  const coachId = (formData.get("coachId") as string) || null;
  const schoolId = (formData.get("schoolId") as string)?.trim() || null;
  const locationId = (formData.get("locationId") as string)?.trim() || null;
  const capacityStr = formData.get("capacity") as string | null;
  const planningNotes = (formData.get("planningNotes") as string) || null;
  const isOneOff = formData.get("isOneOff") === "on"; // checkbox: marcado = aula única

  if (!modality || !date || !startTime || !endTime) {
    return { error: "Preencha modalidade, data, hora início e hora fim." };
  }
  if (!coachId) {
    return { error: "Seleciona um coach para a aula." };
  }
  if (!schoolId) {
    return { error: "Seleciona uma escola para a aula." };
  }

  const capacity = capacityStr ? parseInt(capacityStr, 10) : null;
  if (capacityStr && (capacity === null || isNaN(capacity) || capacity < 1)) {
    return { error: "Capacidade deve ser um número positivo." };
  }

  const baseDate = new Date(date + "T12:00:00");
  const dayOfWeek = baseDate.getDay();
  const count = isOneOff ? 1 : RECURRING_WEEKS;

  const rows: {
    id: string;
    modality: string;
    date: string;
    startTime: string;
    endTime: string;
    coachId: string;
    schoolId: string;
    locationId: string | null;
    capacity: number | null;
    planningNotes: string | null;
    isOneOff: boolean;
  }[] = [];

  for (let i = 0; i < count; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i * 7);
    const dateStr = d.toISOString().slice(0, 10);
    rows.push({
      id: crypto.randomUUID(),
      modality: modality!,
      date: dateStr,
      startTime: startTime!,
      endTime: endTime!,
      coachId: coachId!,
      schoolId,
      locationId: locationId || null,
      capacity: capacity ?? null,
      planningNotes: planningNotes || null,
      isOneOff: isOneOff || count === 1,
    });
  }

  const { error } = await supabase.from("Lesson").insert(rows);

  if (error) {
    console.error("createLesson error:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/turmas");
  revalidatePath("/admin");
  return {
    success: true,
    created: count,
    message:
      count === 1
        ? "Aula criada."
        : `${count} aulas criadas (recorrência semanal até ${rows[rows.length - 1]!.date}).`,
  };
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

export type DeleteLessonResult = { error?: string; success?: boolean };

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
  return { success: true };
}
