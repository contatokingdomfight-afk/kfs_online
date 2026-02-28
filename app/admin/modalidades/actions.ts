"use server";

import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { revalidatePath } from "next/cache";

export type ModalityResult = { error?: string; success?: boolean };

export async function createModality(_prev: ModalityResult | null, formData: FormData): Promise<ModalityResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

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
