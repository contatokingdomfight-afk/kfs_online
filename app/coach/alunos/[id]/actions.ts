"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentCoachId } from "@/lib/auth/get-current-coach";
import { revalidatePath } from "next/cache";

export type SaveStandaloneEvaluationResult = { error?: string; success?: boolean };

/** Avaliação do aluno fora da aula (a partir do perfil do aluno). */
export async function saveStandaloneEvaluation(
  _prev: SaveStandaloneEvaluationResult | null,
  formData: FormData
): Promise<SaveStandaloneEvaluationResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) return { error: "Sessão inválida." };
  if (dbUser.role !== "COACH" && dbUser.role !== "ADMIN") return { error: "Sem permissão." };

  const currentCoachId = await getCurrentCoachId();
  if (dbUser.role === "COACH" && !currentCoachId) return { error: "Perfil de coach não encontrado." };

  const studentId = (formData.get("studentId") as string)?.trim();
  const modality = (formData.get("modality") as string)?.trim();
  const scoresJson = (formData.get("scoresJson") as string)?.trim() || null;
  const note = (formData.get("note") as string)?.trim() || null;

  if (!studentId || !modality) return { error: "Aluno ou modalidade em falta." };

  let scores: Record<string, number> | null = null;
  let gas: number | null = null;
  let technique: number | null = null;
  let strength: number | null = null;
  let theory: number | null = null;

  if (scoresJson) {
    try {
      const parsed = JSON.parse(scoresJson) as Record<string, unknown>;
      if (parsed && typeof parsed === "object") {
        scores = {};
        for (const [k, v] of Object.entries(parsed)) {
          const n = typeof v === "number" ? v : parseInt(String(v), 10);
          if (!Number.isNaN(n) && n >= 1 && n <= 10) scores[k] = n;
        }
        if (Object.keys(scores).length === 0) return { error: "Indica pelo menos um critério (1–10)." };
      }
    } catch {
      return { error: "Scores inválidos." };
    }
  } else {
    gas = parseInt(String(formData.get("gas")), 10);
    technique = parseInt(String(formData.get("technique")), 10);
    strength = parseInt(String(formData.get("strength")), 10);
    theory = parseInt(String(formData.get("theory")), 10);
    const valid = (n: number) => !Number.isNaN(n) && n >= 1 && n <= 5;
    if (!valid(gas) || !valid(technique) || !valid(strength) || !valid(theory)) {
      return { error: "Cada dimensão deve ser entre 1 e 5." };
    }
  }

  const supabase = await createClient();

  let { data: athlete } = await supabase.from("Athlete").select("id, mainCoachId").eq("studentId", studentId).maybeSingle();
  let effectiveCoachId = currentCoachId ?? (dbUser.role === "ADMIN" && athlete?.mainCoachId ? athlete.mainCoachId : null);

  if (!athlete) {
    const newId = crypto.randomUUID();
    const insertCoachId = effectiveCoachId ?? currentCoachId ?? null;
    const { error: insertErr } = await supabase.from("Athlete").insert({
      id: newId,
      studentId,
      level: "INICIANTE",
      mainCoachId: insertCoachId,
    });
    if (insertErr) {
      console.error("saveStandaloneEvaluation Athlete insert:", insertErr);
      return { error: insertErr.message };
    }
    athlete = { id: newId, mainCoachId: insertCoachId };
    effectiveCoachId = insertCoachId;
  } else if (dbUser.role === "ADMIN" && !effectiveCoachId && athlete.mainCoachId) {
    effectiveCoachId = athlete.mainCoachId;
  }

  if (!effectiveCoachId) return { error: "Não foi possível associar um coach ao atleta. Atribui um coach ao aluno." };

  const { error } = await supabase.from("AthleteEvaluation").insert({
    athleteId: athlete.id,
    coachId: effectiveCoachId,
    modality,
    lessonId: null,
    gas: gas ?? null,
    technique: technique ?? null,
    strength: strength ?? null,
    theory: theory ?? null,
    scores: scores ?? null,
    note,
  });

  if (error) {
    console.error("saveStandaloneEvaluation insert:", error);
    return { error: error.message };
  }

  const { processMissionAwards } = await import("@/lib/xp-missions");
  await processMissionAwards(supabase, athlete.id);

  revalidatePath(`/coach/alunos/${studentId}`);
  revalidatePath("/admin/alunos");
  revalidatePath(`/admin/alunos/${studentId}`);
  revalidatePath("/coach/atletas");
  return { success: true };
}

export type EvaluationDetail = {
  id: string;
  coachName: string;
  date: string;
  note: string | null;
  modality: string | null;
  gas: number | null;
  technique: number | null;
  strength: number | null;
  theory: number | null;
  scores: Record<string, number> | null;
};

/** Obtém uma avaliação por id (para modal de histórico). Coach/Admin com acesso ao aluno. */
export async function getEvaluationById(evalId: string): Promise<EvaluationDetail | { error: string }> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || (dbUser.role !== "COACH" && dbUser.role !== "ADMIN")) return { error: "Sem permissão." };

  const supabase = await createClient();
  const { data: evalRow, error: evalErr } = await supabase
    .from("AthleteEvaluation")
    .select("id, athleteId, coachId, note, created_at, modality, gas, technique, strength, theory, scores")
    .eq("id", evalId)
    .single();

  if (evalErr || !evalRow) return { error: "Avaliação não encontrada." };

  const { data: athlete } = await supabase.from("Athlete").select("studentId").eq("id", evalRow.athleteId).single();
  if (!athlete) return { error: "Atleta não encontrado." };

  if (dbUser.role === "COACH") {
    const coachId = await getCurrentCoachId();
    if (!coachId) return { error: "Acesso negado." };
    const { data: student } = await supabase.from("Student").select("schoolId").eq("id", athlete.studentId).single();
    const { data: coach } = await supabase.from("Coach").select("schoolId").eq("id", coachId).single();
    if (!coach || !student || student.schoolId !== coach.schoolId) return { error: "Acesso negado." };
  }

  let coachName = "Treinador";
  if (evalRow.coachId) {
    const { data: coach } = await supabase.from("Coach").select("userId").eq("id", evalRow.coachId).single();
    if (coach) {
      const { data: user } = await supabase.from("User").select("name").eq("id", coach.userId).single();
      coachName = user?.name ?? coachName;
    }
  }

  const dateStr = evalRow.created_at
    ? new Date(evalRow.created_at).toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "";

  return {
    id: evalRow.id,
    coachName,
    date: dateStr,
    note: (evalRow.note as string | null) ?? null,
    modality: evalRow.modality ?? null,
    gas: evalRow.gas ?? null,
    technique: evalRow.technique ?? null,
    strength: evalRow.strength ?? null,
    theory: evalRow.theory ?? null,
    scores: (evalRow.scores as Record<string, number> | null) ?? null,
  };
}
