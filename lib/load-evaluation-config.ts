import type { SupabaseClient } from "@supabase/supabase-js";
import { parseConfig, type ModalityEvaluationConfigPayload } from "@/lib/evaluation-config";

/**
 * Lista códigos de modalidade (igual a ModalityRef no admin).
 * Não usar getCachedModalityRefs aqui: esse módulo importa `lib/supabase/server` e este ficheiro
 * é transitivamente importado por `xp-missions` (usado em componentes cliente).
 */
async function getModalityCodes(supabase: SupabaseClient): Promise<string[]> {
  const { data } = await supabase.from("ModalityRef").select("code").order("sortOrder", { ascending: true });
  return (data ?? []).map((r) => r.code);
}

/**
 * Carrega as configurações de avaliação para todas as modalidades em ModalityRef (em paralelo).
 * KICKBOXING usa a mesma config que MUAY_THAI (alias interno em loadEvaluationConfigForModality).
 * Sem cache: as páginas que chamam esta função são force-dynamic e os critérios devem
 * reflectir imediatamente qualquer alteração feita no admin.
 */
export async function loadAllEvaluationConfigs(
  supabase: SupabaseClient
): Promise<Map<string, ModalityEvaluationConfigPayload | null>> {
  const codes = await getModalityCodes(supabase);
  if (codes.length === 0) return new Map();
  const configs = await Promise.all(codes.map((mod) => loadEvaluationConfigForModality(supabase, mod)));
  return new Map(codes.map((mod, i) => [mod, configs[i]]));
}

/** Muay Thai e Kickboxing partilham a mesma estrutura de avaliação. */
const MUAY_KICKBOXING_ALIAS: Record<string, string> = {
  KICKBOXING: "MUAY_THAI",
};

/** Modalidades que usam SEMPRE EvaluationComponent (nunca config legado). */
const MODALITIES_USE_COMPONENTS = ["MUAY_THAI", "BOXING", "KICKBOXING", "MMA"] as const;

/**
 * Carrega a configuração de avaliação para uma modalidade.
 * KICKBOXING usa a mesma config que MUAY_THAI (avaliação idêntica).
 * Para MUAY_THAI/BOXING/KICKBOXING/MMA: usa SEMPRE EvaluationComponent + EvaluationCriterion.
 * Para outras modalidades: fallback para ModalityEvaluationConfig (JSON legado).
 */
export async function loadEvaluationConfigForModality(
  supabase: SupabaseClient,
  modality: string
): Promise<ModalityEvaluationConfigPayload | null> {
  const effectiveModality = MUAY_KICKBOXING_ALIAS[modality] ?? modality;
  const useComponentsOnly = MODALITIES_USE_COMPONENTS.includes(effectiveModality as (typeof MODALITIES_USE_COMPONENTS)[number]);

  const { data: components } = await supabase
    .from("EvaluationComponent")
    .select("id, name, sortOrder, dimensionId")
    .eq("modality", effectiveModality)
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
        const nome =
          dim
            ? (comp.name === dim.name ? dim.name : `${dim.name} - ${comp.name}`)
            : comp.name;
        return {
          nome,
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

  if (useComponentsOnly) return null;

  const { data: row } = await supabase
    .from("ModalityEvaluationConfig")
    .select("config")
    .eq("modality", effectiveModality)
    .maybeSingle();

  if (row?.config) return parseConfig(row.config as unknown);
  return null;
}
