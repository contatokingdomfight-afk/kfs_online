/**
 * Estrutura de configuração de critérios de avaliação por modalidade.
 * Admin edita; coach vê sliders dinâmicos; radar usa labels e eixos.
 */

export type CriterionConfig = {
  id: string;
  label: string;
  tipo: "range_1_10";
  description?: string | null;
};

export type CategoryConfig = {
  nome: string;
  /** Código da dimensão geral (ex: tecnico, tatico). Usado para agregar no radar. */
  code?: string;
  criterios: CriterionConfig[];
};

export type ModalityEvaluationConfigPayload = {
  categorias: CategoryConfig[];
};

export function getAllCriterionIds(config: ModalityEvaluationConfigPayload): string[] {
  const ids: string[] = [];
  config.categorias.forEach((cat) => cat.criterios.forEach((c) => ids.push(c.id)));
  return ids;
}

/** Eixos para o radar: lista plana de { id, label } por ordem das categorias. */
export function getRadarAxes(config: ModalityEvaluationConfigPayload): { id: string; label: string }[] {
  const axes: { id: string; label: string }[] = [];
  config.categorias.forEach((cat) => cat.criterios.forEach((c) => axes.push({ id: c.id, label: c.label })));
  return axes;
}

/** Mapa criterionId -> nome da categoria (para exibição). */
export function getCriterionToCategory(config: ModalityEvaluationConfigPayload): Map<string, string> {
  const map = new Map<string, string>();
  config.categorias.forEach((cat) => cat.criterios.forEach((c) => map.set(c.id, cat.nome)));
  return map;
}

/** Mapa criterionId -> código da dimensão geral (para agregar no radar). Quando existe, preferir a getCriterionToCategory para o eixo. */
export function getCriterionToDimensionCode(config: ModalityEvaluationConfigPayload): Map<string, string> {
  const map = new Map<string, string>();
  config.categorias.forEach((cat) => {
    const code = cat.code ?? null;
    if (code) cat.criterios.forEach((c) => map.set(c.id, code));
  });
  return map;
}

export function parseConfig(configJson: unknown): ModalityEvaluationConfigPayload | null {
  if (!configJson || typeof configJson !== "object") return null;
  const o = configJson as Record<string, unknown>;
  if (!Array.isArray(o.categorias)) return null;
  const categorias: CategoryConfig[] = [];
  for (const cat of o.categorias) {
    if (!cat || typeof cat !== "object" || typeof (cat as Record<string, unknown>).nome !== "string") continue;
    const criterios: CriterionConfig[] = [];
    const arr = (cat as Record<string, unknown>).criterios;
    if (Array.isArray(arr)) {
      for (const c of arr) {
        if (c && typeof c === "object" && typeof (c as Record<string, unknown>).id === "string" && typeof (c as Record<string, unknown>).label === "string") {
          criterios.push({
            id: (c as Record<string, unknown>).id as string,
            label: (c as Record<string, unknown>).label as string,
            tipo: (c as Record<string, unknown>).tipo === "range_1_10" ? "range_1_10" : "range_1_10",
          });
        }
      }
    }
    categorias.push({ nome: (cat as Record<string, unknown>).nome as string, criterios });
  }
  return { categorias };
}

/** Média móvel: para cada criterionId, média dos valores nas últimas N avaliações (que tenham scores). */
export function computeMovingAverage(
  evaluations: { scores: Record<string, number> | null }[],
  criterionIds: string[],
  lastN: number
): Record<string, number> {
  const recent = evaluations.slice(0, lastN).filter((e) => e.scores && typeof e.scores === "object");
  const result: Record<string, number> = {};
  for (const id of criterionIds) {
    const values: number[] = [];
    recent.forEach((e) => {
      const v = (e.scores as Record<string, number>)[id];
      if (typeof v === "number" && v >= 1 && v <= 10) values.push(v);
    });
    if (values.length > 0) {
      result[id] = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
    }
  }
  return result;
}
