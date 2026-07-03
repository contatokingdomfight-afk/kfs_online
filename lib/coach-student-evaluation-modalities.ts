import { MODALITY_LABELS } from "@/lib/lesson-utils";
import type { ModalityEvaluationConfigPayload } from "@/lib/evaluation-config";

export type EvaluationModalityOption = { value: string; label: string };

/**
 * Modalidades disponíveis no modal «Avaliar performance», respeitando o plano do aluno
 * (`getPlanAccess().allowedModalities`) e critérios configurados no admin.
 */
export function filterModalitiesForStudentEvaluation(
  modalityRefs: { code: string; name: string | null }[],
  evaluationConfigByModality: Record<string, ModalityEvaluationConfigPayload | null>,
  allowedModalities: string[]
): EvaluationModalityOption[] {
  const withConfig = (modalityRefs ?? [])
    .map((m) => ({
      value: m.code,
      label: (m.name?.trim() || MODALITY_LABELS[m.code] || m.code) as string,
    }))
    .filter((opt) => evaluationConfigByModality[opt.value] != null);

  if (allowedModalities.length === 0) return withConfig;

  const allowed = new Set(allowedModalities);
  return withConfig.filter((opt) => allowed.has(opt.value));
}

/** Modalidade inicial do modal: primária do aluno se permitida; senão a única disponível. */
export function resolveEvaluationInitialModality(
  primaryModality: string | null,
  modalities: EvaluationModalityOption[],
  evaluationConfigByModality: Record<string, ModalityEvaluationConfigPayload | null>
): string {
  if (
    primaryModality &&
    modalities.some((m) => m.value === primaryModality) &&
    evaluationConfigByModality[primaryModality] != null
  ) {
    return primaryModality;
  }
  if (modalities.length === 1) return modalities[0].value;
  return modalities[0]?.value ?? "";
}
