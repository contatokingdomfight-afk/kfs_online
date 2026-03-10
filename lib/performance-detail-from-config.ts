import { categoryToGeneralDimension, dimensionCodeToGeneralDimension } from "@/lib/performance-utils";
import { GENERAL_PERFORMANCE_AXES } from "@/lib/performance-utils";
import type { ModalityEvaluationConfigPayload } from "@/lib/evaluation-config";
import type { DetailGroup, DetailItem, DimensionDetail } from "@/lib/performance-detail-structure";

const DIMENSION_ORDER = ["tecnico", "tatico", "fisico", "mental", "teorico"] as const;
const DIMENSION_LABELS: Record<string, string> = Object.fromEntries(
  GENERAL_PERFORMANCE_AXES.map((a) => [a.id, a.label])
);

export type ConfigWithModality = { modality: string; config: ModalityEvaluationConfigPayload };

/**
 * Constrói a estrutura "Por componente" a partir dos critérios cadastrados
 * (Admin → Critérios de avaliação). Cada dimensão geral (Técnico, Tático, etc.)
 * é preenchida com os componentes e critérios reais das modalidades.
 */
export function buildPerformanceDetailFromConfigs(
  configs: ConfigWithModality[],
  modalityLabels?: Map<string, string>
): Record<string, DimensionDetail> {
  const byDim: Record<string, { title: string; groups: DetailGroup[] }> = {};

  for (const { modality, config } of configs) {
    const modalityLabel = modalityLabels?.get(modality) ?? modality;

    for (const cat of config.categorias) {
      const dim = cat.code ?? categoryToGeneralDimension(cat.nome);
      if (!dim) continue;

      if (!byDim[dim]) {
        byDim[dim] = {
          title: DIMENSION_LABELS[dim] ?? cat.nome,
          groups: [],
        };
      }

      const groupTitle =
        configs.length > 1 && configs.some((c) => c.modality !== modality)
          ? `${cat.nome} (${modalityLabel})`
          : cat.nome;

      const items: DetailItem[] = cat.criterios.map((c) => ({
        label: c.label,
        note: c.description ?? undefined,
      }));

      byDim[dim].groups.push({
        title: groupTitle,
        items,
      });
    }
  }

  const result: Record<string, DimensionDetail> = {};
  const orderedIds = [...DIMENSION_ORDER, ...Object.keys(byDim).filter((d) => !DIMENSION_ORDER.includes(d as any))];
  for (const dim of orderedIds) {
    if (byDim[dim]?.groups.length) {
      result[dim] = {
        title: byDim[dim].title,
        groups: byDim[dim].groups,
      };
    }
  }
  return result;
}

/** Ordem das dimensões para exibir: primeiro as 5 padrão, depois outras. */
export function getDetailOrder(detailByDimension: Record<string, DimensionDetail>): string[] {
  const withContent = (dim: string) => detailByDimension[dim]?.groups?.length;
  const standard = DIMENSION_ORDER.filter((dim) => withContent(dim));
  const others = Object.keys(detailByDimension).filter((d) => !DIMENSION_ORDER.includes(d as any));
  return [...standard, ...others];
}

/**
 * Agrupa detailSource por dimensão geral (5 pilares). Em vez de dezenas de secções
 * (uma por critério/categoria), devolve apenas 5 secções (Técnico, Tático, Físico, Mental, Teórico)
 * com todos os grupos/critérios reunidos dentro de cada uma.
 */
export function groupDetailByGeneralDimension(
  detailSource: Record<string, DimensionDetail>,
  detailOrder: string[]
): Record<string, DimensionDetail> {
  const merged: Record<string, { title: string; groups: DetailGroup[] }> = {};
  for (const dimId of detailOrder) {
    const detail = detailSource[dimId];
    if (!detail?.groups?.length) continue;
    const generalDim = DIMENSION_ORDER.includes(dimId as (typeof DIMENSION_ORDER)[number])
      ? dimId
      : dimensionCodeToGeneralDimension(dimId);
    const key = generalDim ?? dimId;
    if (!merged[key]) {
      merged[key] = {
        title: DIMENSION_LABELS[key] ?? detail.title,
        groups: [],
      };
    }
    merged[key].groups.push(...detail.groups);
  }
  const result: Record<string, DimensionDetail> = {};
  for (const dim of DIMENSION_ORDER) {
    if (merged[dim]?.groups.length) {
      result[dim] = { title: merged[dim].title, groups: merged[dim].groups };
    }
  }
  return result;
}

export const PERFORMANCE_DETAIL_ORDER = DIMENSION_ORDER;
