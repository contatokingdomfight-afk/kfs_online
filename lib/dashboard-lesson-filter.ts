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

export function filterLessonsForDashboard<T extends DashboardLessonRow>(
  lessons: T[],
  input: DashboardLessonFilterInput
): T[] {
  const { hasPlan, hasCheckIn, allowedModalities, studentPrimaryModality, modalitiesListLength } = input;
  const isFullPlan = allowedModalities.length >= modalitiesListLength;

  return lessons.filter((l) => {
    const isOpenClass = Boolean(l.isOpenClass);
    if (isOpenClass) return true;
    if (!hasPlan) return false;
    if (!hasCheckIn) return false;
    if (allowedModalities.length === 0) return false;
    if (isFullPlan) return true;
    if (studentPrimaryModality) return l.modality === studentPrimaryModality;
    return allowedModalities.includes(l.modality);
  });
}
