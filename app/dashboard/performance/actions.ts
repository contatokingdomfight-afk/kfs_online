"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";

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
  /** Nomes dos critérios (id → label) para mostrar no modal em vez de UUID. */
  criterionLabels?: Record<string, string>;
};

/** Obtém uma avaliação por id (para modal). Apenas se pertencer ao aluno atual. */
export async function getMyEvaluationById(evalId: string): Promise<EvaluationDetail | { error: string }> {
  const studentId = await getCurrentStudentId();
  if (!studentId) return { error: "Sessão inválida." };

  const supabase = await createClient();
  const { data: athlete } = await supabase.from("Athlete").select("id").eq("studentId", studentId).single();
  if (!athlete) return { error: "Perfil de atleta não encontrado." };

  const { data: evalRow, error: evalErr } = await supabase
    .from("AthleteEvaluation")
    .select("id, athleteId, coachId, note, created_at, modality, gas, technique, strength, theory, scores")
    .eq("id", evalId)
    .eq("athleteId", athlete.id)
    .single();

  if (evalErr || !evalRow) return { error: "Avaliação não encontrada." };

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

  const scores = (evalRow.scores as Record<string, number> | null) ?? null;
  let criterionLabels: Record<string, string> = {};
  if (scores && Object.keys(scores).length > 0) {
    const { data: criteria } = await supabase
      .from("EvaluationCriterion")
      .select("id, label")
      .in("id", Object.keys(scores));
    (criteria ?? []).forEach((c) => {
      criterionLabels[c.id] = c.label ?? c.id;
    });
  }

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
    scores,
    criterionLabels,
  };
}
