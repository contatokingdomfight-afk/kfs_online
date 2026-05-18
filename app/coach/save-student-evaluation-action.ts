"use server";

import { saveEvaluationFromLesson } from "@/app/coach/aula/actions";
import { saveStandaloneEvaluation } from "@/app/coach/alunos/[id]/actions";

export type SaveCoachStudentEvaluationResult = { error?: string; success?: boolean };

/**
 * Uma única action para o modal de avaliação (aula vs perfil), para um só `useFormState`
 * e transição/pending coerentes no cliente.
 */
export async function saveCoachStudentEvaluation(
  prev: SaveCoachStudentEvaluationResult | null,
  formData: FormData
): Promise<SaveCoachStudentEvaluationResult> {
  const raw = formData.get("lessonId");
  const lessonId = typeof raw === "string" ? raw.trim() : "";
  if (lessonId) {
    return saveEvaluationFromLesson(prev, formData);
  }
  return saveStandaloneEvaluation(prev, formData);
}
