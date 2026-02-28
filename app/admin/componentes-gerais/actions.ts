"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { randomUUID } from "crypto";

export type DimensionResult = { error?: string; success?: boolean };

function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .trim() || "dimension";
}

export async function createDimension(_prev: DimensionResult | null, formData: FormData): Promise<DimensionResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const name = (formData.get("name") as string)?.trim() || "";
  const codeInput = (formData.get("code") as string)?.trim()?.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") || "";
  if (!name) return { error: "Nome é obrigatório." };

  const code = codeInput || slugFromName(name);
  if (!code) return { error: "Código inválido." };

  const result = getAdminClientOrNull();
  if (!result.client) return { error: "Configuração do servidor em falta." };
  const supabase = result.client;

  const { data: max } = await supabase
    .from("GeneralDimension")
    .select("sortOrder")
    .order("sortOrder", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = (max?.sortOrder ?? -1) + 1;

  const id = randomUUID();
  const { error } = await supabase.from("GeneralDimension").insert({ id, code, name, sortOrder });

  if (error) {
    if (error.code === "23505") return { error: "Já existe uma componente geral com este código." };
    console.error("createDimension:", error);
    return { error: error.message };
  }
  revalidatePath("/admin/componentes-gerais");
  revalidatePath("/admin/avaliacao");
  revalidatePath("/dashboard/performance");
  revalidatePath("/coach");
  return { success: true };
}

export async function deleteDimension(_prev: DimensionResult | null, formData: FormData): Promise<DimensionResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const id = (formData.get("dimensionId") as string)?.trim();
  if (!id) return { error: "ID da componente é obrigatório." };

  const result = getAdminClientOrNull();
  if (!result.client) return { error: "Configuração do servidor em falta." };
  const supabase = result.client;

  const { count } = await supabase
    .from("EvaluationComponent")
    .select("id", { count: "exact", head: true })
    .eq("dimensionId", id);
  if (count && count > 0) return { error: "Não é possível eliminar: existem critérios de avaliação associados a esta componente em pelo menos uma modalidade." };

  const { error } = await supabase.from("GeneralDimension").delete().eq("id", id);
  if (error) {
    console.error("deleteDimension:", error);
    return { error: error.message };
  }
  revalidatePath("/admin/componentes-gerais");
  revalidatePath("/admin/avaliacao");
  revalidatePath("/dashboard/performance");
  revalidatePath("/coach");
  return { success: true };
}
