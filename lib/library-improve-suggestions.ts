import type { GeneralPerformanceAxisId } from "@/lib/performance-utils";

export type LibraryCourseRef = {
  id: string;
  name: string;
  category: string;
  modality: string | null;
};

export type ImproveSuggestion = {
  axisId: GeneralPerformanceAxisId;
  axisLabel: string;
  course: LibraryCourseRef;
};

/** Mapeia cada pilar do radar para categorias de curso na biblioteca. */
export const AXIS_TO_COURSE_CATEGORIES: Record<GeneralPerformanceAxisId, readonly string[]> = {
  tecnico: ["TECHNIQUE"],
  tatico: ["TECHNIQUE", "PERFORMANCE"],
  fisico: ["PERFORMANCE"],
  mental: ["MINDSET"],
  teorico: ["MINDSET", "TECHNIQUE"],
};

function courseMatchesAxis(course: LibraryCourseRef, axisId: GeneralPerformanceAxisId): boolean {
  const cats = AXIS_TO_COURSE_CATEGORIES[axisId];
  return cats.includes(course.category);
}

function sortCoursesForAxis(
  courses: LibraryCourseRef[],
  axisId: GeneralPerformanceAxisId,
  primaryModality: string | null
): LibraryCourseRef[] {
  return [...courses]
    .filter((c) => courseMatchesAxis(c, axisId))
    .sort((a, b) => {
      if (primaryModality) {
        const aMod = a.modality === primaryModality ? 1 : 0;
        const bMod = b.modality === primaryModality ? 1 : 0;
        if (bMod !== aMod) return bMod - aMod;
      }
      return a.name.localeCompare(b.name, "pt");
    });
}

/**
 * Sugere um curso da biblioteca por eixo fraco (score abaixo do máximo).
 * Devolve no máximo `limitPerAxis` cursos distintos (1 por eixo, por defeito).
 */
export function getImproveSuggestionsForAxes(
  accessibleCourses: LibraryCourseRef[],
  weakAxes: Array<{ id: GeneralPerformanceAxisId; label: string }>,
  primaryModality: string | null,
  limitPerAxis = 1
): ImproveSuggestion[] {
  const used = new Set<string>();
  const out: ImproveSuggestion[] = [];

  for (const axis of weakAxes) {
    const ranked = sortCoursesForAxis(accessibleCourses, axis.id, primaryModality);
    const picked = ranked.filter((c) => !used.has(c.id)).slice(0, limitPerAxis);
    for (const course of picked) {
      used.add(course.id);
      out.push({ axisId: axis.id, axisLabel: axis.label, course });
    }
  }

  return out;
}

/** Ordena cursos acessíveis priorizando eixos fracos (substitui sort só por modalidade). */
export function rankCoursesForImprovement(
  accessibleCourses: LibraryCourseRef[],
  weakAxisIds: GeneralPerformanceAxisId[],
  primaryModality: string | null,
  limit = 3
): LibraryCourseRef[] {
  const suggestions = getImproveSuggestionsForAxes(
    accessibleCourses,
    weakAxisIds.map((id) => ({ id, label: id })),
    primaryModality,
    1
  );
  const ordered = suggestions.map((s) => s.course);
  if (ordered.length >= limit) return ordered.slice(0, limit);

  const used = new Set(ordered.map((c) => c.id));
  const filler = [...accessibleCourses]
    .filter((c) => !used.has(c.id))
    .sort((a, b) => {
      if (primaryModality) {
        const aMod = a.modality === primaryModality ? 1 : 0;
        const bMod = b.modality === primaryModality ? 1 : 0;
        if (bMod !== aMod) return bMod - aMod;
      }
      return a.name.localeCompare(b.name, "pt");
    });
  return [...ordered, ...filler].slice(0, limit);
}
