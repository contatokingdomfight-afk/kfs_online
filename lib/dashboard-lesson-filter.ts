/** Filtro de aulas da semana no dashboard do aluno (próxima aula / lista). */

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
