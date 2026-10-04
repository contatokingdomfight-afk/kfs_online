"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";

export type SubmitCoachTestimonialResult = { error?: string; success?: boolean };

export async function submitCoachTestimonial(
  _prev: SubmitCoachTestimonialResult | null,
  formData: FormData
): Promise<SubmitCoachTestimonialResult> {
  const studentId = await getCurrentStudentId();
  if (!studentId) return { error: "Sessão inválida. Faz login." };

  const coachId = (formData.get("coachId") as string)?.trim();
  const body = (formData.get("body") as string)?.trim();
  const ratingRaw = (formData.get("rating") as string)?.trim();
  const rating = Number(ratingRaw);

  if (!coachId) return { error: "Treinador inválido." };
  if (!body || body.length < 10) return { error: "Escreve um depoimento com pelo menos 10 caracteres." };
  if (body.length > 1000) return { error: "Depoimento demasiado longo (máx. 1000 caracteres)." };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "Escolhe uma pontuação de 1 a 5." };

  const supabase = await createClient();

  // Só pode avaliar o próprio treinador principal — evita depoimentos sobre quem nunca orientou o aluno.
  const { data: athlete } = await supabase.from("Athlete").select("mainCoachId").eq("studentId", studentId).maybeSingle();
  if (!athlete || (athlete as { mainCoachId?: string | null }).mainCoachId !== coachId) {
    return { error: "Só podes avaliar o teu treinador principal." };
  }

  const { error } = await supabase.from("CoachTestimonial").upsert(
    {
      coachId,
      studentId,
      rating,
      body,
      status: "PENDING",
      moderatedByUserId: null,
      moderatedAt: null,
      updatedAt: new Date().toISOString(),
    },
    { onConflict: "coachId,studentId" }
  );
  if (error) return { error: error.message };

  revalidatePath("/dashboard/perfil");
  revalidatePath(`/t/c/${coachId}`);
  return { success: true };
}
