/** Paleta partilhada para séries por modalidade nos gráficos do dashboard admin. */
export const MODALITY_CHART_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#ef4444", "#94a3b8"];

/** Mapa modalityCode -> cor, estável entre gráficos quando `codesInOrder` é o catálogo da escola. */
export function buildModalityColorMap(codesInOrder: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  codesInOrder.forEach((code, i) => {
    map[code] = MODALITY_CHART_COLORS[i % MODALITY_CHART_COLORS.length];
  });
  return map;
}
