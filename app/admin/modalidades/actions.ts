"use server";

import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { networkAdminPermissionError } from "@/lib/permissions/network-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { MODALITIES_CACHE_TAG } from "@/lib/cached-reference-data";

export type ModalityResult = { error?: string; success?: boolean };

export async function createModality(_prev: ModalityResult | null, formData: FormData): Promise<ModalityResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };
  const permErr = await networkAdminPermissionError("admin:sistema:write");
  if (permErr) return { error: permErr };

  const code = (formData.get("code") as string)?.trim()?.toUpperCase().replace(/\s+/g, "_") || "";
  const name = (formData.get("name") as string)?.trim() || "";
  if (!code || !name) return { error: "Código e nome são obrigatórios." };
  if (!/^[A-Z0-9_]+$/.test(code)) return { error: "Código deve conter apenas letras maiúsculas, números e underscore (ex: BJJ, KICKBOXING)." };

  const result = getAdminClientOrNull();
  if (!result.client) return { error: "Configuração do servidor em falta." };
  const supabase = result.client;

  const { data: max } = await supabase
    .from("ModalityRef")
    .select("sortOrder")
    .order("sortOrder", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = (max?.sortOrder ?? -1) + 1;

  const { error } = await supabase.from("ModalityRef").insert({ code, name, sortOrder });

  if (error) {
    if (error.code === "23505") return { error: "Já existe uma modalidade com este código." };
    console.error("createModality:", error);
    return { error: error.message };
  }
  revalidateTag(MODALITIES_CACHE_TAG);
  revalidatePath("/admin/modalidades");
  revalidatePath("/admin/turmas");
  revalidatePath("/admin/alunos");
  revalidatePath("/admin/avaliacao");
  revalidatePath("/coach/alunos");
  return { success: true };
}

export async function deleteModality(code: string): Promise<ModalityResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };
  const permErr = await networkAdminPermissionError("admin:sistema:write");
  if (permErr) return { error: permErr };
  const trimmed = code?.trim();
  if (!trimmed) return { error: "Código inválido." };

  const result = getAdminClientOrNull();
  if (!result.client) return { error: "Configuração do servidor em falta." };
  const supabase = result.client;

  const { count: lessonsCount } = await supabase.from("Lesson").select("id", { count: "exact", head: true }).eq("modality", trimmed);
  if (lessonsCount && lessonsCount > 0) return { error: "Não é possível eliminar: existem aulas com esta modalidade." };

  const { error } = await supabase.from("ModalityRef").delete().eq("code", trimmed);
  if (error) {
    console.error("deleteModality:", error);
    return { error: error.message };
  }
  revalidateTag(MODALITIES_CACHE_TAG);
  revalidatePath("/admin/modalidades");
  revalidatePath("/admin/turmas");
  revalidatePath("/admin/alunos");
  revalidatePath("/coach/alunos");
  return { success: true };
}

export async function deleteModalityAction(_prev: ModalityResult | null, formData: FormData): Promise<ModalityResult> {
  const code = (formData.get("code") as string) ?? "";
  return deleteModality(code);
}

/**
 * Admin Geral: aprova («passa para a rede») ou recusa a proposta de uma escola para a sua modalidade própria.
 * Aprovar limpa ModalityRef.schoolId — a modalidade, as aulas, os alunos e os graus mantêm-se; as outras escolas
 * passam a poder ligá-la (fica desligada nelas até o diretor a ligar).
 */
export async function decideModalityProposal(code: string, approve: boolean): Promise<ModalityResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };
  const permErr = await networkAdminPermissionError("admin:sistema:write");
  if (permErr) return { error: permErr };
  const result = getAdminClientOrNull();
  if (!result.client) return { error: "Configuração do servidor em falta." };
  const supabase = result.client;

  const { data: mod } = await supabase.from("ModalityRef").select("code, schoolId, networkProposalAt").eq("code", code).maybeSingle();
  if (!mod?.schoolId) return { error: "Esta modalidade já é da rede." };
  if (!mod.networkProposalAt) return { error: "Esta modalidade não foi proposta à rede." };

  if (approve) {
    // As outras escolas recebem-na desligada (decidem elas se a oferecem).
    const { data: schools } = await supabase.from("School").select("id").neq("id", mod.schoolId as string);
    const rows = (schools ?? []).map((s) => ({ schoolId: s.id as string, modalityCode: code, updatedByUserId: dbUser.id }));
    if (rows.length) {
      const { error: offErr } = await supabase.from("SchoolModalityDisabled").upsert(rows, { onConflict: "schoolId,modalityCode", ignoreDuplicates: true });
      if (offErr) {
        console.error("decideModalityProposal disable:", offErr);
        return { error: "Não foi possível aprovar. Tenta de novo." };
      }
    }
  }
  const { error } = await supabase
    .from("ModalityRef")
    .update(approve ? { schoolId: null, networkProposalAt: null } : { networkProposalAt: null })
    .eq("code", code);
  if (error) {
    console.error("decideModalityProposal:", error);
    return { error: "Não foi possível guardar. Tenta de novo." };
  }
  revalidateTag(MODALITIES_CACHE_TAG);
  revalidatePath("/admin/modalidades");
  revalidatePath("/admin/graduacao");
  return { success: true };
}
