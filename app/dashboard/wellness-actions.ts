"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { calendarDateLisbon } from "@/lib/lesson-check-in-window";
import { quickAnswersToWellness, type WellnessZone } from "@/lib/wellness-score";
import { upsertPreLessonWellness } from "@/lib/pre-lesson-wellness";

export type QuickWellnessState = { error?: string; zone?: WellnessZone } | null;

/** «Como estás hoje?» na Home: bem-estar para uma aula de hoje em que o aluno marcou «Vou» (ou já fez check-in). */
export async function saveQuickWellnessAction(_prev: QuickWellnessState, formData: FormData): Promise<QuickWellnessState> {
  const lessonId = String(formData.get("lessonId") ?? "").trim();
  const occurrenceDate = String(formData.get("occurrenceDate") ?? "").trim().slice(0, 10);
  const input = quickAnswersToWellness({
    sleep: (formData.get("wSleep") as string | null) || null,
    body: (formData.get("wBody") as string | null) || null,
    mind: (formData.get("wMind") as string | null) || null,
  });
  if (!lessonId || occurrenceDate !== calendarDateLisbon(new Date())) return { error: "Aula inválida." };
  if (!input) return { error: "Responde às 3 perguntas." };

  const studentId = await getCurrentStudentId();
  if (!studentId) return { error: "Sessão inválida." };
  const supabase = await createClient();

  const { data: att } = await supabase
    .from("Attendance")
    .select("id, status")
    .eq("studentId", studentId)
    .eq("lessonId", lessonId)
    .eq("occurrenceDate", occurrenceDate)
    .maybeSingle();
  const status = (att as { status?: string } | null)?.status;
  if (!att || (status !== "PENDING" && status !== "CONFIRMED")) return { error: "Marca «Vou» nesta aula primeiro." };

  const { zone, error } = await upsertPreLessonWellness(supabase, { studentId, lessonId, occurrenceDate, input });
  if (error) return { error: "Não foi possível guardar. Tenta outra vez." };
  // Já com check-in feito: a zona vermelha deixa de contar para conquistas (como no check-in).
  if (status === "CONFIRMED") {
    await supabase.from("Attendance").update({ countsForGamification: zone !== "RED" }).eq("id", (att as { id: string }).id);
  }

  revalidatePath("/dashboard");
  return { zone };
}
