/**
 * Exame de graduação: construção da ficha de avaliação e cálculo do resultado (funções puras).
 *
 * O exame é cumulativo (opção 1 acordada com a academia):
 * - itens NOVOS do grau a obter: um a um (1–5);
 * - graus anteriores: uma nota de REVISÃO por eixo (1–5);
 * - itens CRÍTICOS dos graus anteriores: um a um (1–5).
 * Aprovação: em cada eixo, média dos itens novos ≥ mínimo E nota de revisão ≥ mínimo;
 * cada item crítico (novo ou anterior) ≥ mínimo. Com vários avaliadores, usa-se a média.
 */

import { GRADUATION_AXES, type GraduationAxis, type GraduationGradeDraft, type GraduationItemDraft } from "./template";

export const EXAM_SCORE_MIN = 1;
export const EXAM_SCORE_MAX = 5;
/** Meses mínimos entre uma reprovação e um novo exame do mesmo grau. */
export const EXAM_RETAKE_MIN_MONTHS = 2;

export type ExamSection = "NEW" | "REVIEW_ITEM" | "REVIEW_AXIS";

export type ExamSheetEntry = {
  key: string;
  section: ExamSection;
  axis: GraduationAxis;
  label: string;
  description: string | null;
  isCritical: boolean;
  /** Para REVIEW_ITEM: grau de origem. */
  gradeName?: string;
};

export type ExamReviewAxis = {
  entry: ExamSheetEntry;
  /** Itens dos graus anteriores neste eixo (referência para o avaliador). */
  reference: { gradeName: string; items: GraduationItemDraft[] }[];
};

export type ExamSheet = {
  targetGrade: GraduationGradeDraft;
  passMin: number;
  newEntries: ExamSheetEntry[];
  reviewAxes: ExamReviewAxis[];
  reviewCriticalEntries: ExamSheetEntry[];
};

export const reviewKey = (axis: GraduationAxis) => `review:${axis}`;

export function buildExamSheet(grades: GraduationGradeDraft[], targetIndex: number): ExamSheet {
  const target = grades[targetIndex];
  if (!target) throw new Error("Grau alvo inexistente.");
  const previous = grades.slice(0, targetIndex);

  const newEntries: ExamSheetEntry[] = GRADUATION_AXES.flatMap((axis) =>
    target.items
      .filter((i) => i.axis === axis)
      .map((i) => ({ key: i.id, section: "NEW" as const, axis, label: i.label, description: i.description, isCritical: i.isCritical }))
  );

  const reviewAxes: ExamReviewAxis[] = GRADUATION_AXES.flatMap((axis) => {
    const reference = previous
      .map((g) => ({ gradeName: g.name, items: g.items.filter((i) => i.axis === axis) }))
      .filter((r) => r.items.length > 0);
    if (reference.length === 0) return [];
    return [
      {
        entry: {
          key: reviewKey(axis),
          section: "REVIEW_AXIS" as const,
          axis,
          label: `Revisão ${axis}`,
          description: null,
          isCritical: false,
        },
        reference,
      },
    ];
  });

  const reviewCriticalEntries: ExamSheetEntry[] = previous.flatMap((g) =>
    g.items
      .filter((i) => i.isCritical)
      .map((i) => ({
        key: i.id,
        section: "REVIEW_ITEM" as const,
        axis: i.axis,
        label: i.label,
        description: i.description,
        isCritical: true,
        gradeName: g.name,
      }))
  );

  return { targetGrade: target, passMin: target.passMinAxisAvg, newEntries, reviewAxes, reviewCriticalEntries };
}

export function sheetEntries(sheet: ExamSheet): ExamSheetEntry[] {
  return [...sheet.newEntries, ...sheet.reviewAxes.map((r) => r.entry), ...sheet.reviewCriticalEntries];
}

export type ExamScoreInput = { key: string; score: number | null; examinerUserId: string };

export type ExamAxisResult = {
  axis: GraduationAxis;
  newAvg: number | null;
  newCount: number;
  reviewScore: number | null;
  /** null quando o eixo não tem conteúdo a avaliar nessa parte. */
  newPassed: boolean | null;
  reviewPassed: boolean | null;
};

export type ExamResult = {
  passMin: number;
  axes: ExamAxisResult[];
  criticalFailures: { key: string; label: string; score: number }[];
  missingKeys: string[];
  scoredCount: number;
  totalCount: number;
  examinerCount: number;
  isComplete: boolean;
  passed: boolean;
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Média por chave entre avaliadores (ignora notas vazias). */
export function averageScoresByKey(scores: ExamScoreInput[]): Map<string, number> {
  const byKey = new Map<string, number[]>();
  for (const s of scores) {
    if (s.score == null) continue;
    const list = byKey.get(s.key) ?? [];
    list.push(s.score);
    byKey.set(s.key, list);
  }
  const out = new Map<string, number>();
  for (const [k, list] of byKey) out.set(k, round1(mean(list)!));
  return out;
}

export function computeExamResult(sheet: ExamSheet, scores: ExamScoreInput[]): ExamResult {
  const avg = averageScoresByKey(scores);
  const entries = sheetEntries(sheet);
  const passMin = sheet.passMin;

  const axes: ExamAxisResult[] = GRADUATION_AXES.flatMap((axis) => {
    const newEntries = sheet.newEntries.filter((e) => e.axis === axis);
    const review = sheet.reviewAxes.find((r) => r.entry.axis === axis);
    if (newEntries.length === 0 && !review) return [];
    const newScores = newEntries.map((e) => avg.get(e.key)).filter((v): v is number => v != null);
    const newAvgRaw = mean(newScores);
    const newAvg = newAvgRaw == null ? null : round1(newAvgRaw);
    const reviewScore = review ? avg.get(review.entry.key) ?? null : null;
    return [
      {
        axis,
        newAvg,
        newCount: newEntries.length,
        reviewScore,
        newPassed: newEntries.length === 0 ? null : newAvg != null && newAvg >= passMin,
        reviewPassed: review ? reviewScore != null && reviewScore >= passMin : null,
      },
    ];
  });

  const criticalFailures = entries
    .filter((e) => e.isCritical)
    .flatMap((e) => {
      const s = avg.get(e.key);
      return s != null && s < passMin ? [{ key: e.key, label: e.label, score: s }] : [];
    });

  const missingKeys = entries.filter((e) => !avg.has(e.key)).map((e) => e.key);
  const isComplete = missingKeys.length === 0;
  const axesOk = axes.every((a) => a.newPassed !== false && a.reviewPassed !== false);

  return {
    passMin,
    axes,
    criticalFailures,
    missingKeys,
    scoredCount: entries.length - missingKeys.length,
    totalCount: entries.length,
    examinerCount: new Set(scores.filter((s) => s.score != null).map((s) => s.examinerUserId)).size,
    isComplete,
    passed: isComplete && axesOk && criticalFailures.length === 0,
  };
}

/** Data a partir da qual o aluno pode repetir o exame após reprovar. */
export function retakeAvailableFrom(failedAt: Date): Date {
  const d = new Date(failedAt);
  d.setUTCMonth(d.getUTCMonth() + EXAM_RETAKE_MIN_MONTHS);
  return d;
}
