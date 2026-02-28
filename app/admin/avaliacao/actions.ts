"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { parseConfig } from "@/lib/evaluation-config";
import { randomUUID } from "crypto";

export type SaveEvaluationConfigResult = { error?: string; success?: boolean };


function getClient() {
  const result = getAdminClientOrNull();
  if (!result.client) return { error: result.error === "wrong_key" ? "Usa a chave service_role no .env." : "Configuração Supabase em falta." as const, client: null };
  return { client: result.client, error: null };
}

export async function saveModalityEvaluationConfig(
  _prev: SaveEvaluationConfigResult | null,
  formData: FormData
): Promise<SaveEvaluationConfigResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const modality = (formData.get("modality") as string)?.trim();
  const configJson = (formData.get("configJson") as string)?.trim();
  if (!modality || !configJson) return { error: "Modalidade e JSON são obrigatórios." };

  let parsed: unknown;
  try {
    parsed = JSON.parse(configJson);
  } catch {
    return { error: "JSON inválido." };
  }

  const config = parseConfig(parsed);
  if (!config || config.categorias.length === 0) return { error: "Config deve ter pelo menos uma categoria com critérios." };

  const out = getClient();
  if (!out.client) return { error: out.error! };

  const { error } = await out.client
    .from("ModalityEvaluationConfig")
    .upsert(
      { modality, config: config as unknown as Record<string, unknown>, updatedAt: new Date().toISOString() },
      { onConflict: "modality" }
    );

  if (error) {
    console.error("saveModalityEvaluationConfig:", error);
    return { error: error.message };
  }
  revalidatePath("/admin/avaliacao");
  revalidatePath("/coach/aula");
  revalidatePath("/coach/atletas");
  return { success: true };
}

// --- Novas actions: Componentes e Critérios (estrutura modalidade → componente → critério com descrição) ---

export type ComponentResult = { error?: string; success?: boolean };
export type CriterionResult = { error?: string; success?: boolean };

export async function createComponent(_prev: ComponentResult | null, formData: FormData): Promise<ComponentResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };
  const modality = (formData.get("modality") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const dimensionId = (formData.get("dimensionId") as string)?.trim() || null;
  if (!modality) return { error: "Modalidade é obrigatória." };
  if (!dimensionId && !name) return { error: "Nome ou dimensão são obrigatórios." };

  const out = getClient();
  if (!out.client) return { error: out.error! };

  if (dimensionId) {
    const { data: existing } = await out.client.from("EvaluationComponent").select("id").eq("modality", modality).eq("dimensionId", dimensionId).maybeSingle();
    if (existing) return { error: "Já existe uma componente para esta dimensão nesta modalidade." };
    const { data: dim } = await out.client.from("GeneralDimension").select("sortOrder, name").eq("id", dimensionId).single();
    const sortOrder = dim?.sortOrder ?? 0;
    const id = randomUUID();
    const { error } = await out.client.from("EvaluationComponent").insert({ id, modality, dimensionId, name: dim?.name ?? "Componente", sortOrder });
    if (error) {
      console.error("createComponent:", error);
      return { error: error.message };
    }
  } else {
    const id = randomUUID();
    const { data: components } = await out.client.from("EvaluationComponent").select("sortOrder").eq("modality", modality).order("sortOrder", { ascending: false }).limit(1);
    const sortOrder = (components?.[0]?.sortOrder ?? -1) + 1;
    const { error } = await out.client.from("EvaluationComponent").insert({ id, modality, name, sortOrder });
    if (error) {
      console.error("createComponent:", error);
      return { error: error.message };
    }
  }
  revalidatePath("/admin/avaliacao");
  revalidatePath("/coach/aula");
  revalidatePath("/coach/atletas");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/performance");
  return { success: true };
}

/** Obtém ou cria a componente para (modalidade, dimensão). Devolve o componentId. */
async function getOrCreateComponentForDimension(
  supabase: NonNullable<Awaited<ReturnType<typeof getClient>>["client"]>,
  modality: string,
  dimensionId: string
): Promise<{ componentId: string; error?: string }> {
  const { data: existing } = await supabase.from("EvaluationComponent").select("id").eq("modality", modality).eq("dimensionId", dimensionId).maybeSingle();
  if (existing) return { componentId: existing.id };
  const { data: dim } = await supabase.from("GeneralDimension").select("sortOrder, name").eq("id", dimensionId).single();
  const sortOrder = dim?.sortOrder ?? 0;
  const id = randomUUID();
  const { error } = await supabase.from("EvaluationComponent").insert({ id, modality, dimensionId, name: dim?.name ?? "Componente", sortOrder });
  if (error) return { componentId: "", error: error.message };
  return { componentId: id };
}

export async function updateComponent(_prev: ComponentResult | null, formData: FormData): Promise<ComponentResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };
  const id = (formData.get("componentId") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  if (!id || !name) return { error: "ID do componente e nome são obrigatórios." };

  const out = getClient();
  if (!out.client) return { error: out.error! };

  const { error } = await out.client.from("EvaluationComponent").update({ name }).eq("id", id);
  if (error) {
    console.error("updateComponent:", error);
    return { error: error.message };
  }
  revalidatePath("/admin/avaliacao");
  revalidatePath("/coach/aula");
  revalidatePath("/coach/atletas");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/performance");
  return { success: true };
}

export async function deleteComponent(_prev: ComponentResult | null, formData: FormData): Promise<ComponentResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };
  const id = (formData.get("componentId") as string)?.trim();
  if (!id) return { error: "ID do componente é obrigatório." };

  const out = getClient();
  if (!out.client) return { error: out.error! };

  const { error } = await out.client.from("EvaluationComponent").delete().eq("id", id);
  if (error) {
    console.error("deleteComponent:", error);
    return { error: error.message };
  }
  revalidatePath("/admin/avaliacao");
  revalidatePath("/coach/aula");
  revalidatePath("/coach/atletas");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/performance");
  return { success: true };
}

export async function createCriterion(_prev: CriterionResult | null, formData: FormData): Promise<CriterionResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };
  let componentId = (formData.get("componentId") as string)?.trim() || null;
  const modality = (formData.get("modality") as string)?.trim() || null;
  const dimensionId = (formData.get("dimensionId") as string)?.trim() || null;
  const label = (formData.get("label") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  if (!label) return { error: "Designação do critério é obrigatória." };
  if (!componentId && (!modality || !dimensionId)) return { error: "Componente ou (modalidade + dimensão) são obrigatórios." };

  const out = getClient();
  if (!out.client) return { error: out.error! };

  if (!componentId && modality && dimensionId) {
    const got = await getOrCreateComponentForDimension(out.client, modality, dimensionId);
    if (got.error) return { error: got.error };
    componentId = got.componentId;
  }
  if (!componentId) return { error: "Componente em falta." };

  const { data: criteria } = await out.client.from("EvaluationCriterion").select("sortOrder").eq("componentId", componentId).order("sortOrder", { ascending: false }).limit(1);
  const sortOrder = (criteria?.[0]?.sortOrder ?? -1) + 1;

  const id = randomUUID();
  const { error } = await out.client.from("EvaluationCriterion").insert({ id, componentId, label, description, sortOrder });
  if (error) {
    console.error("createCriterion:", error);
    return { error: error.message };
  }
  revalidatePath("/admin/avaliacao");
  revalidatePath("/coach/aula");
  revalidatePath("/coach/atletas");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/performance");
  return { success: true };
}

export async function updateCriterion(_prev: CriterionResult | null, formData: FormData): Promise<CriterionResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };
  const id = (formData.get("criterionId") as string)?.trim();
  const label = (formData.get("label") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  if (!id || !label) return { error: "ID do critério e designação são obrigatórios." };

  const out = getClient();
  if (!out.client) return { error: out.error! };

  const { error } = await out.client.from("EvaluationCriterion").update({ label, description }).eq("id", id);
  if (error) {
    console.error("updateCriterion:", error);
    return { error: error.message };
  }
  revalidatePath("/admin/avaliacao");
  revalidatePath("/coach/aula");
  revalidatePath("/coach/atletas");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/performance");
  return { success: true };
}

export async function deleteCriterion(_prev: CriterionResult | null, formData: FormData): Promise<CriterionResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };
  const id = (formData.get("criterionId") as string)?.trim();
  if (!id) return { error: "ID do critério é obrigatório." };

  const out = getClient();
  if (!out.client) return { error: out.error! };

  const { error } = await out.client.from("EvaluationCriterion").delete().eq("id", id);
  if (error) {
    console.error("deleteCriterion:", error);
    return { error: error.message };
  }
  revalidatePath("/admin/avaliacao");
  revalidatePath("/coach/aula");
  revalidatePath("/coach/atletas");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/performance");
  return { success: true };
}
