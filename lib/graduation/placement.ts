/**
 * Exame de nivelamento (funções puras): o avaliador vai grau a grau, desde o próximo grau do aluno,
 * avaliando os itens de cada grau um a um. Cada grau cumpre-se como um exame só com itens novos
 * (média por eixo ≥ mínimo do grau e itens críticos ≥ mínimo). A proposta é o último grau
 * cumprido seguido, a partir do primeiro avaliado.
 */

import { computeExamResult, type ExamResult, type ExamScoreInput, type ExamSheet } from "./exam";
import { GRADUATION_AXES, type GraduationGradeDraft } from "./template";

/** Ficha de um só grau: só os seus itens, um a um. */
export function levelSheet(grade: GraduationGradeDraft): ExamSheet {
  return {
    targetGrade: grade,
    passMin: grade.passMinAxisAvg,
    newEntries: GRADUATION_AXES.flatMap((axis) =>
      grade.items
        .filter((i) => i.axis === axis)
        .map((i) => ({
          key: i.id,
          section: "NEW" as const,
          axis,
          label: i.label,
          description: i.description,
          isCritical: i.isCritical,
          gradeName: grade.name,
        }))
    ),
    previousGradeName: null,
    previousEntries: [],
    reviewAxes: [],
    reviewCriticalEntries: [],
  };
}

/** Fichas de cada grau do nivelamento, do primeiro avaliado até ao atual (inclusive). */
export function placementLevelSheets(grades: GraduationGradeDraft[], startIndex: number, frontierIndex: number): ExamSheet[] {
  return grades.slice(startIndex, frontierIndex + 1).map(levelSheet);
}

/** Ficha única com os itens de todos os graus avaliados (para validar e guardar notas). */
export function placementSheet(grades: GraduationGradeDraft[], startIndex: number, frontierIndex: number): ExamSheet {
  const levels = placementLevelSheets(grades, startIndex, frontierIndex);
  const frontier = grades[frontierIndex];
  if (!frontier || levels.length === 0) throw new Error("Nivelamento sem graus.");
  return { ...levels[levels.length - 1], targetGrade: frontier, newEntries: levels.flatMap((l) => l.newEntries) };
}

export type PlacementLevelResult = {
  gradeId: string;
  gradeName: string;
  colors: string[];
  /** Índice no template. */
  index: number;
  result: ExamResult;
};

export type PlacementResult = {
  levels: PlacementLevelResult[];
  /** Índice (no template) do grau proposto; startIndex - 1 = nenhum grau novo. */
  proposedIndex: number;
  /** O grau a ser avaliado agora está completo e cumprido. */
  frontierPassed: boolean;
};

export function computePlacementResult(
  grades: GraduationGradeDraft[],
  startIndex: number,
  frontierIndex: number,
  scores: ExamScoreInput[]
): PlacementResult {
  const levels = placementLevelSheets(grades, startIndex, frontierIndex).map((sheet, i) => ({
    gradeId: sheet.targetGrade.id,
    gradeName: sheet.targetGrade.name,
    colors: sheet.targetGrade.colors,
    index: startIndex + i,
    result: computeExamResult(sheet, scores),
  }));
  let proposedIndex = startIndex - 1;
  for (const level of levels) {
    if (!level.result.passed) break;
    proposedIndex = level.index;
  }
  return { levels, proposedIndex, frontierPassed: levels[levels.length - 1]?.result.passed ?? false };
}

/** Último índice que o nivelamento pode avaliar (grau máximo escolhido ou o último do template). */
export function placementMaxIndex(grades: GraduationGradeDraft[], maxGradeId: string | null): number {
  const i = maxGradeId ? grades.findIndex((g) => g.id === maxGradeId) : -1;
  return i >= 0 ? i : grades.length - 1;
}
