import { categoryToGeneralDimension } from "@/lib/performance-utils";
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
  const orderedIds = [...DIMENSION_ORDER, ...Object.keys(byDim).filter((d) => !DIMENSION_ORDER.includes(d))];
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
  const others = Object.keys(detailByDimension).filter((d) => !DIMENSION_ORDER.includes(d));
  return [...standard, ...others];
}

export const PERFORMANCE_DETAIL_ORDER = DIMENSION_ORDER;
