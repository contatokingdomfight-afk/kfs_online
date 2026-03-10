/**
 * Tipos e helpers para o dashboard de resultados de avaliação.
 */

import type { ModalityEvaluationConfigPayload } from "@/lib/evaluation-config";

export type DimensionScore = {
  id: string;
  label: string;
  score: number;
  maxScore: number;
};

export type CriterionScoreItem = {
  criterionId: string;
  label: string;
  score: number;
  maxScore: number;
  modality: string;
  categoryName: string;
  previousScore?: number;
};

/** Constrói lista de critérios com score e metadados a partir do scores da avaliação e dos configs. */
export function buildCriterionScores(
  evalScores: Record<string, number> | null | undefined,
  configs: { modality: string; config: ModalityEvaluationConfigPayload }[],
  previousEvalScores?: Record<string, number> | null
): CriterionScoreItem[] {
  if (!evalScores || typeof evalScores !== "object") return [];
  const maxScore = 10;
  const result: CriterionScoreItem[] = [];
  const seen = new Set<string>();

  for (const { modality, config } of configs) {
    for (const cat of config.categorias) {
      const categoryName = cat.nome;
      for (const c of cat.criterios) {
        const score = evalScores[c.id];
        if (score == null || seen.has(c.id)) continue;
        seen.add(c.id);
        const numScore = typeof score === "number" ? score : Number(score);
        if (Number.isNaN(numScore)) continue;
        result.push({
          criterionId: c.id,
          label: c.label,
          score: Math.min(maxScore, Math.max(0, numScore)),
          maxScore,
          modality,
          categoryName,
          previousScore:
            previousEvalScores && previousEvalScores[c.id] != null
              ? Math.min(maxScore, Math.max(0, Number(previousEvalScores[c.id])))
              : undefined,
        });
      }
    }
  }
  return result.sort((a, b) => b.score - a.score);
}

/** Top N mais altos e mais baixos para pontos fortes e áreas a melhorar. */
export function getStrengthsAndWeaknesses(
  items: CriterionScoreItem[],
  n: number = 5
): { strengths: CriterionScoreItem[]; weaknesses: CriterionScoreItem[] } {
  const sorted = [...items].sort((a, b) => b.score - a.score);
  const strengths = sorted.slice(0, n);
  const weaknesses = sorted.slice(-n).reverse();
  return { strengths, weaknesses };
}

/** Agrupa critérios por nome de categoria para secções colapsáveis. */
export function groupByCategory(items: CriterionScoreItem[]): Map<string, CriterionScoreItem[]> {
  const map = new Map<string, CriterionScoreItem[]>();
  for (const item of items) {
    const list = map.get(item.categoryName) ?? [];
    list.push(item);
    map.set(item.categoryName, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => b.score - a.score);
  }
  return map;
}

export const DIMENSION_ICONS: Record<string, string> = {
  tecnico: "🥊",
  tatico: "🎯",
  fisico: "💪",
  mental: "🧠",
  teorico: "📚",
};
