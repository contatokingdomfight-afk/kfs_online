"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentCoachId } from "@/lib/auth/get-current-coach";
import { createClient } from "@/lib/supabase/server";

export type UpdateAthleteResult = { error?: string };

export async function updateAthlete(
  _prev: UpdateAthleteResult | null,
  formData: FormData
): Promise<UpdateAthleteResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) return { error: "Não autorizado." };
  if (dbUser.role !== "COACH" && dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const athleteId = (formData.get("athleteId") as string)?.trim();
  const level = formData.get("level") as string;
  const mainCoachIdRaw = (formData.get("mainCoachId") as string)?.trim() || null;
  const validLevels = ["INICIANTE", "INTERMEDIARIO", "AVANCADO"];
  if (!athleteId || !level || !validLevels.includes(level)) return { error: "Dados inválidos." };

  const currentCoachId = await getCurrentCoachId();
  if (dbUser.role === "COACH" && !currentCoachId) return { error: "Perfil de coach não encontrado." };

  const supabase = await createClient();

  if (dbUser.role === "COACH") {
    const { data: athlete } = await supabase
      .from("Athlete")
      .select("id, mainCoachId")
      .eq("id", athleteId)
      .single();
    if (!athlete || athlete.mainCoachId !== currentCoachId) return { error: "Atleta não encontrado ou não és o coach responsável." };
  }

  const updates: { level: string; mainCoachId?: string | null } = { level };
  if (dbUser.role === "ADMIN") {
    updates.mainCoachId = mainCoachIdRaw || null;
  }

  const { error } = await supabase.from("Athlete").update(updates).eq("id", athleteId);

  if (error) return { error: error.message };

  revalidatePath("/coach/atletas");
  revalidatePath(`/coach/atletas/${athleteId}`);
  return {};
}

export type CreateCommentResult = { error?: string };

export async function createComment(
  _prev: CreateCommentResult | null,
  formData: FormData
): Promise<CreateCommentResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) return { error: "Não autorizado." };
  if (dbUser.role !== "COACH" && dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const coachId = await getCurrentCoachId();
  if (!coachId) return { error: "Apenas coaches podem adicionar comentários." };

  const targetId = (formData.get("targetId") as string)?.trim();
  const content = (formData.get("content") as string)?.trim();
  if (!targetId || !content) return { error: "Conteúdo é obrigatório." };

  const supabase = await createClient();

  const { data: athlete } = await supabase.from("Athlete").select("id, mainCoachId").eq("id", targetId).single();
  if (!athlete) return { error: "Atleta não encontrado." };
  if (athlete.mainCoachId !== coachId && dbUser.role !== "ADMIN") return { error: "Não és o coach deste atleta." };

  const id = crypto.randomUUID();
  const { error } = await supabase.from("Comment").insert({
    id,
    authorCoachId: coachId,
    targetType: "ATHLETE",
    targetId,
    content,
    visibility: "PRIVATE",
  });

  if (error) return { error: error.message };

  revalidatePath(`/coach/atletas/${targetId}`);
  return {};
}

export type CreateEvaluationResult = { error?: string };

export async function createEvaluation(
  _prev: CreateEvaluationResult | null,
  formData: FormData
): Promise<CreateEvaluationResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) return { error: "Não autorizado." };
  if (dbUser.role !== "COACH" && dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const coachId = await getCurrentCoachId();
  if (dbUser.role === "COACH" && !coachId) return { error: "Perfil de coach não encontrado." };

  const athleteId = (formData.get("athleteId") as string)?.trim();
  const gas = parseInt(String(formData.get("gas")), 10);
  const technique = parseInt(String(formData.get("technique")), 10);
  const strength = parseInt(String(formData.get("strength")), 10);
  const theory = parseInt(String(formData.get("theory")), 10);
  const note = (formData.get("note") as string)?.trim() || null;

  if (!athleteId) return { error: "Atleta inválido." };
  const valid = (n: number) => !isNaN(n) && n >= 1 && n <= 5;
  if (!valid(gas) || !valid(technique) || !valid(strength) || !valid(theory)) {
    return { error: "Cada dimensão deve ser entre 1 e 5." };
  }

  const supabase = await createClient();
  const { data: athlete } = await supabase.from("Athlete").select("id, mainCoachId").eq("id", athleteId).single();
  if (!athlete) return { error: "Atleta não encontrado." };
  if (athlete.mainCoachId !== coachId && dbUser.role !== "ADMIN") return { error: "Não és o coach deste atleta." };

  const effectiveCoachId = coachId ?? (dbUser.role === "ADMIN" ? athlete.mainCoachId : null);
  if (!effectiveCoachId) return { error: "Atleta sem coach atribuído. Atribui um coach na ficha do atleta." };

  const { error } = await supabase.from("AthleteEvaluation").insert({
    athleteId,
    coachId: effectiveCoachId,
    gas,
    technique,
    strength,
    theory,
    note,
  });

  if (error) {
    console.error("createEvaluation error:", error);
    return { error: error.message };
  }
  revalidatePath(`/coach/atletas/${athleteId}`);
  revalidatePath("/dashboard");
  return {};
}
