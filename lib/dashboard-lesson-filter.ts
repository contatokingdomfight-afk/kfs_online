/** Filtro de aulas da semana no dashboard do aluno (próxima aula / lista). */

import { normalizeModalityCode } from "@/lib/modality-normalize";

export type DashboardModalityViewInput = {
  hasPlan: boolean;
  /** De `getPlanAccess.allowedModalities` */
  allowedModalities: string[];
  studentPrimaryModality: string | null;
};

/**
 * Plano com uma única modalidade (ex.: Presencial I com `modalityScope` SINGLE e `primaryModality`):
 * o aluno só deve ver aulas dessa modalidade no dashboard.
 */
export function shouldRestrictDashboardToSingleModality(input: DashboardModalityViewInput): boolean {
  return input.hasPlan && input.allowedModalities.length === 1 && input.studentPrimaryModality != null;
}

export function filterDashboardLessonsByPlanModality<T extends { modality: string }>(
  lessons: T[],
  input: DashboardModalityViewInput
): T[] {
  if (!shouldRestrictDashboardToSingleModality(input)) return lessons;
  const only = normalizeModalityCode(input.allowedModalities[0] ?? input.studentPrimaryModality ?? "");
  if (!only) return lessons;
  return lessons.filter((l) => normalizeModalityCode(l.modality) === only);
}

export type DashboardLessonRow = {
  modality: string;
  isOpenClass?: boolean | null;
  schoolId?: string | null;
  /** Preenchido no dashboard para exibir local da aula livre. */
  schoolName?: string | null;
};

export type DashboardLessonFilterInput = {
  hasPlan: boolean;
  hasCheckIn: boolean;
  allowedModalities: string[];
  studentPrimaryModality: string | null;
  modalitiesListLength: number;
};

/**
 * Se o aluno pode usar RSVP / check-in nesta aula segundo plano (modalidade, check-in incluído, etc.).
 * Aulas livres: sempre true na camada de plano; o cartão ainda pode limitar quem não tem plano (UI).
 */
export function isLessonParticipationAllowedByPlan<T extends DashboardLessonRow>(
  lesson: T,
  input: DashboardLessonFilterInput
): boolean {
  const isOpenClass = Boolean(lesson.isOpenClass);
  if (isOpenClass) return true;
  const { hasPlan, hasCheckIn, allowedModalities, studentPrimaryModality, modalitiesListLength } = input;
  if (!hasPlan) return false;
  if (!hasCheckIn) return false;
  if (allowedModalities.length === 0) return false;
  const isFullPlan = allowedModalities.length >= modalitiesListLength;
  if (isFullPlan) return true;
  if (studentPrimaryModality) return lesson.modality === studentPrimaryModality;
  return allowedModalities.includes(lesson.modality);
}

/** @deprecated Preferir listar todas as aulas e usar `isLessonParticipationAllowedByPlan` por cartão. */
export function filterLessonsForDashboard<T extends DashboardLessonRow>(
  lessons: T[],
  input: DashboardLessonFilterInput
): T[] {
  return lessons.filter((l) => isLessonParticipationAllowedByPlan(l, input));
}
