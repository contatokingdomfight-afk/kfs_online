"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import type { EvaluationHistoryModalDetail } from "@/lib/evaluation-history-modal-types";
import { evaluationHistoryCoachDisplayName, evaluationHistoryFetchPreviousSnapshot } from "@/lib/evaluation-history-helpers";

export type { EvaluationHistoryModalDetail };

/** @deprecated use EvaluationHistoryModalDetail */
export type EvaluationDetail = EvaluationHistoryModalDetail;

/** Obtém uma avaliação por id (para modal). Apenas se pertencer ao aluno atual. */
export async function getMyEvaluationById(evalId: string): Promise<EvaluationHistoryModalDetail | { error: string }> {
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

  const coachName = await evaluationHistoryCoachDisplayName(supabase, evalRow.coachId as string | null);

  const dateStr = evalRow.created_at
    ? new Date(evalRow.created_at as string).toLocaleDateString("pt-PT", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const scores = (evalRow.scores as Record<string, number> | null) ?? null;
  let criterionLabels: Record<string, string> = {};
  if (scores && Object.keys(scores).length > 0) {
    const { data: criteria } = await supabase.from("EvaluationCriterion").select("id, label").in("id", Object.keys(scores));
    (criteria ?? []).forEach((c) => {
      criterionLabels[c.id] = c.label ?? c.id;
    });
  }

  const createdAt = evalRow.created_at as string | undefined;
  const previous =
    createdAt != null ? await evaluationHistoryFetchPreviousSnapshot(supabase, athlete.id as string, createdAt) : null;

  return {
    id: evalRow.id as string,
    coachName,
    date: dateStr,
    note: (evalRow.note as string | null) ?? null,
    modality: (evalRow.modality as string | null) ?? null,
    gas: (evalRow.gas as number | null) ?? null,
    technique: (evalRow.technique as number | null) ?? null,
    strength: (evalRow.strength as number | null) ?? null,
    theory: (evalRow.theory as number | null) ?? null,
    scores,
    criterionLabels,
    previous,
  };
}
