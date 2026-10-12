/** Filtro de aulas da semana no dashboard do aluno (próxima aula / lista). */

import { normalizeModalityCode } from "@/lib/modality-normalize";

export type DashboardModalityViewInput = {
  hasPlan: boolean;
  /** De `getPlanAccess.allowedModalities` */
  allowedModalities: string[];
  studentPrimaryModality: string | null;
  /** `Student.extraModalities`: modalidades além das do plano (ex.: KIDS que treina nos adultos). */
  extraModalities?: string[];
};

/**
 * Plano com uma única modalidade (ex.: Presencial I com `modalityScope` SINGLE e `primaryModality`):
 * o aluno vê aulas **dessa modalidade** e **todas as aulas livres** (`isOpenClass`), de qualquer modalidade.
 */
export function shouldRestrictDashboardToSingleModality(input: DashboardModalityViewInput): boolean {
  return input.hasPlan && input.allowedModalities.length === 1 && input.studentPrimaryModality != null;
}

export function filterDashboardLessonsByPlanModality<
  T extends { modality: string; isOpenClass?: boolean | null }
>(lessons: T[], input: DashboardModalityViewInput): T[] {
  if (!shouldRestrictDashboardToSingleModality(input)) return lessons;
  const only = normalizeModalityCode(input.allowedModalities[0] ?? input.studentPrimaryModality ?? "");
  if (!only) return lessons;
  const extra = new Set((input.extraModalities ?? []).map((m) => m.trim().toUpperCase()));
  return lessons.filter((l) => {
    if (Boolean(l.isOpenClass)) return true;
    if (l.modality && extra.has(String(l.modality).trim().toUpperCase())) return true;
    const n =
      normalizeModalityCode(l.modality) ??
      (l.modality ? String(l.modality).trim().toUpperCase() : null);
    return n === only;
  });
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
  /** `Student.extraModalities` — contam como incluídas no plano. */
  extraModalities?: string[];
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
  const lessonModality = lesson.modality;
  if (input.extraModalities?.includes(lessonModality)) return true;
  if (allowedModalities.length === 0) return false;
  const isFullPlan = allowedModalities.length >= modalitiesListLength;
  // Plano multi-modalidade cobre só as modalidades do plano — não aulas de códigos novos (ex. MTKIDS).
  if (isFullPlan) return allowedModalities.includes(lessonModality);
  if (studentPrimaryModality) return lessonModality === studentPrimaryModality;
  return allowedModalities.includes(lessonModality);
}

/** @deprecated Preferir listar todas as aulas e usar `isLessonParticipationAllowedByPlan` por cartão. */
export function filterLessonsForDashboard<T extends DashboardLessonRow>(
  lessons: T[],
  input: DashboardLessonFilterInput
): T[] {
  return lessons.filter((l) => isLessonParticipationAllowedByPlan(l, input));
}
