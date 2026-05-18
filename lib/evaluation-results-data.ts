/**
 * Tipos e helpers para o dashboard de resultados de avaliação.
 */

import type { ModalityEvaluationConfigPayload } from "@/lib/evaluation-config";
import { categoryToGeneralDimension } from "@/lib/performance-utils";

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

export type BuildCriterionScoresOptions = {
  /**
   * Critérios em falta no JSON (avaliação esparsa) assumem esta nota, **apenas** para linhas da
   * `evaluationModality` indicada — evita inventar notas noutras modalidades no mesmo mapa.
   */
  implicitCriterionBaseline?: number;
  evaluationModality?: string | null;
};

/** Constrói lista de critérios com score e metadados a partir do scores da avaliação e dos configs. */
export function buildCriterionScores(
  evalScores: Record<string, number> | null | undefined,
  configs: { modality: string; config: ModalityEvaluationConfigPayload }[],
  previousEvalScores?: Record<string, number> | null,
  options?: BuildCriterionScoresOptions
): CriterionScoreItem[] {
  if (!evalScores || typeof evalScores !== "object") return [];
  const maxScore = 10;
  const result: CriterionScoreItem[] = [];
  const seen = new Set<string>();
  const fill =
    options?.implicitCriterionBaseline != null &&
    Number.isFinite(options.implicitCriterionBaseline)
      ? Math.min(maxScore, Math.max(0, options.implicitCriterionBaseline))
      : null;
  const evalMod = options?.evaluationModality ?? null;

  for (const { modality, config } of configs) {
    const applyFill = fill != null && evalMod != null && modality === evalMod;
    for (const cat of config.categorias) {
      const categoryName = cat.nome;
      for (const c of cat.criterios) {
        if (seen.has(c.id)) continue;
        const raw = evalScores[c.id];
        const resolved =
          raw != null && typeof raw === "number" && !Number.isNaN(raw)
            ? raw
            : applyFill
              ? fill
              : null;
        if (resolved == null) continue;
        seen.add(c.id);
        const numScore = typeof resolved === "number" ? resolved : Number(resolved);
        if (Number.isNaN(numScore)) continue;
        const prevRaw = previousEvalScores?.[c.id];
        const previousScore =
          prevRaw != null && typeof prevRaw === "number" && !Number.isNaN(prevRaw)
            ? Math.min(maxScore, Math.max(0, prevRaw))
            : undefined;
        result.push({
          criterionId: c.id,
          label: c.label,
          score: Math.min(maxScore, Math.max(0, numScore)),
          maxScore,
          modality,
          categoryName,
          previousScore,
        });
      }
    }
  }
  return result.sort((a, b) => b.score - a.score);
}

/**
 * Constrói lista de critérios atribuindo a cada um a pontuação da sua dimensão geral.
 * Usado quando a avaliação não tem scores por critério (só gas/technique/strength/theory):
 * assim o novo dashboard (barras, categorias, filtros) é sempre mostrado.
 */
export function buildCriterionScoresFromDimensionScores(
  configs: { modality: string; config: ModalityEvaluationConfigPayload }[],
  dimensionScores: Record<string, number>
): CriterionScoreItem[] {
  const maxScore = 10;
  const result: CriterionScoreItem[] = [];
  const seen = new Set<string>();

  for (const { modality, config } of configs) {
    for (const cat of config.categorias) {
      const categoryName = cat.nome;
      const dimId = cat.code ?? categoryToGeneralDimension(cat.nome) ?? "tecnico";
      const score = Math.min(maxScore, Math.max(0, dimensionScores[dimId] ?? 0));

      for (const c of cat.criterios) {
        if (seen.has(c.id)) continue;
        seen.add(c.id);
        result.push({
          criterionId: c.id,
          label: c.label,
          score,
          maxScore,
          modality,
          categoryName,
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

/**
 * Extrai o agrupamento principal a partir do nome completo da categoria (ex.: "Físico - X" → "Físico").
 * Usa o primeiro " - "; se não existir, devolve o nome completo. Sem valores fixos.
 */
export function mainCategoryFromCategoryName(categoryName: string | null | undefined): string {
  if (categoryName == null || typeof categoryName !== "string") return "";
  const t = categoryName.trim();
  if (!t) return "";
  const sep = " - ";
  const i = t.indexOf(sep);
  if (i <= 0) return t;
  const head = t.slice(0, i).trim();
  return head || t;
}

/** Parte após o primeiro " - " para título compacto quando um filtro principal está ativo. */
export function subLabelFromCategoryName(categoryName: string | null | undefined): string {
  if (categoryName == null || typeof categoryName !== "string") return "";
  const t = categoryName.trim();
  if (!t) return "";
  const sep = " - ";
  const i = t.indexOf(sep);
  if (i === -1) return t;
  const rest = t.slice(i + sep.length).trim();
  return rest || t;
}

export const DIMENSION_ICONS: Record<string, string> = {
  tecnico: "🥊",
  tatico: "🎯",
  fisico: "💪",
  mental: "🧠",
  teorico: "📚",
};
