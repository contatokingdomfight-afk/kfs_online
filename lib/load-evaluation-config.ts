import type { SupabaseClient } from "@supabase/supabase-js";
import { parseConfig, type ModalityEvaluationConfigPayload } from "@/lib/evaluation-config";

/**
 * Carrega a configuração de avaliação para uma modalidade.
 * Primeiro tenta as tabelas EvaluationComponent + EvaluationCriterion (nova estrutura);
 * se não houver dados, usa ModalityEvaluationConfig.config (JSON legado).
 */
export async function loadEvaluationConfigForModality(
  supabase: SupabaseClient,
  modality: string
): Promise<ModalityEvaluationConfigPayload | null> {
  const { data: components } = await supabase
    .from("EvaluationComponent")
    .select("id, name, sortOrder, dimensionId")
    .eq("modality", modality)
    .order("sortOrder", { ascending: true });

  if (components?.length) {
    const dimensionIds = [...new Set((components ?? []).map((c) => c.dimensionId).filter(Boolean))] as string[];
    const { data: dimensions } = dimensionIds.length > 0
      ? await supabase.from("GeneralDimension").select("id, code, name").in("id", dimensionIds)
      : { data: [] as { id: string; code: string; name: string }[] | null };
    const dimensionById = new Map<string, { code: string; name: string }>();
    (dimensions ?? []).forEach((d) => dimensionById.set(d.id, { code: d.code, name: d.name }));

    const componentIds = components!.map((c) => c.id);
    const { data: criteria } = await supabase
      .from("EvaluationCriterion")
      .select("id, componentId, label, description, sortOrder")
      .in("componentId", componentIds)
      .order("sortOrder", { ascending: true });

    const criteriaByComponent = new Map<string, { id: string; label: string; description: string | null }[]>();
    (criteria ?? []).forEach((c) => {
      const list = criteriaByComponent.get(c.componentId) ?? [];
      list.push({ id: c.id, label: c.label, description: c.description ?? null });
      criteriaByComponent.set(c.componentId, list);
    });

    const categorias = components!
      .map((comp) => {
        const dim = comp.dimensionId ? dimensionById.get(comp.dimensionId) : null;
        return {
          nome: dim?.name ?? comp.name,
          code: dim?.code,
          criterios: (criteriaByComponent.get(comp.id) ?? []).map((cr) => ({
            id: cr.id,
            label: cr.label,
            tipo: "range_1_10" as const,
            description: cr.description,
          })),
        };
      })
      .filter((cat) => cat.criterios.length > 0);

    if (categorias.length > 0) return { categorias };
  }

  const { data: row } = await supabase
    .from("ModalityEvaluationConfig")
    .select("config")
    .eq("modality", modality)
    .maybeSingle();

  if (row?.config) return parseConfig(row.config as unknown);
  return null;
}
