export type CoachFeedbackSource = "comment" | "evaluation" | "default";

/**
 * Texto do bloco «Feedback do treinador» na performance do aluno:
 * 1) último comentário do coach com visibility SHARED;
 * 2) senão, nota (não vazia) da última avaliação;
 * 3) senão, o UI usa texto genérico.
 */
export function resolveCoachFeedbackForStudentView(params: {
  sharedCommentContent: string | null | undefined;
  sharedCommentCoachName: string | null | undefined;
  lastEvaluationCoachName: string | null | undefined;
  lastEvaluationNote: string | null | undefined;
}): {
  quote: string | null;
  coachName: string | null;
  source: CoachFeedbackSource;
  /** Evitar repetir a mesma nota em «Última avaliação» e em «Feedback». */
  hideNoteInLastEvaluationSection: boolean;
} {
  const c = params.sharedCommentContent?.trim();
  if (c) {
    return {
      quote: c,
      coachName: params.sharedCommentCoachName?.trim() || "Treinador",
      source: "comment",
      hideNoteInLastEvaluationSection: false,
    };
  }
  const n = params.lastEvaluationNote?.trim();
  if (n) {
    return {
      quote: n,
      coachName: params.lastEvaluationCoachName?.trim() || "Treinador",
      source: "evaluation",
      hideNoteInLastEvaluationSection: true,
    };
  }
  return {
    quote: null,
    coachName: null,
    source: "default",
    hideNoteInLastEvaluationSection: false,
  };
}
