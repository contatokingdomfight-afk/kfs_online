"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";

export type UnitFormResult = { error?: string };

export async function createUnit(
  _prev: UnitFormResult | null,
  formData: FormData
): Promise<UnitFormResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const moduleId = (formData.get("moduleId") as string)?.trim();
  const courseId = (formData.get("courseId") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const contentType = (formData.get("contentType") as string) === "TEXT" ? "TEXT" : "VIDEO";
  const videoUrl = (formData.get("videoUrl") as string)?.trim() || null;
  const textContent = (formData.get("textContent") as string)?.trim() || null;
  const sortOrderStr = (formData.get("sortOrder") as string)?.trim();

  if (!moduleId || !courseId || !name) return { error: "Módulo, curso e nome são obrigatórios." };
  if (contentType === "VIDEO" && !videoUrl) return { error: "URL do vídeo é obrigatória para conteúdo em vídeo." };
  if (contentType === "TEXT" && !textContent) return { error: "Texto é obrigatório para conteúdo de leitura." };
  const sortOrder = sortOrderStr ? parseInt(sortOrderStr, 10) : 0;
  if (isNaN(sortOrder)) return { error: "Ordem deve ser um número." };

  const supabase = createAdminClient();
  const id = crypto.randomUUID();

  const { error } = await supabase.from("CourseUnit").insert({
    id,
    module_id: moduleId,
    name,
    description,
    content_type: contentType,
    video_url: contentType === "VIDEO" ? videoUrl : null,
    text_content: contentType === "TEXT" ? textContent : null,
    sort_order: sortOrder,
  });

  if (error) {
    console.error("createUnit error:", error);
    return { error: error.message };
  }

  revalidatePath(`/admin/cursos/${courseId}`);
  revalidatePath(`/dashboard/biblioteca/${courseId}`);
  return {};
}

export async function updateUnit(
  _prev: UnitFormResult | null,
  formData: FormData
): Promise<UnitFormResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const unitId = (formData.get("unitId") as string)?.trim();
  const moduleId = (formData.get("moduleId") as string)?.trim();
  const courseId = (formData.get("courseId") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const contentType = (formData.get("contentType") as string) === "TEXT" ? "TEXT" : "VIDEO";
  const videoUrl = (formData.get("videoUrl") as string)?.trim() || null;
  const textContent = (formData.get("textContent") as string)?.trim() || null;
  const sortOrderStr = (formData.get("sortOrder") as string)?.trim();

  if (!unitId || !moduleId || !courseId || !name) return { error: "Dados inválidos." };
  if (contentType === "VIDEO" && !videoUrl) return { error: "URL do vídeo é obrigatória para conteúdo em vídeo." };
  if (contentType === "TEXT" && !textContent) return { error: "Texto é obrigatório para conteúdo de leitura." };
  const sortOrder = sortOrderStr ? parseInt(sortOrderStr, 10) : 0;
  if (isNaN(sortOrder)) return { error: "Ordem deve ser um número." };

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("CourseUnit")
    .update({
      name,
      description,
      content_type: contentType,
      video_url: contentType === "VIDEO" ? videoUrl : null,
      text_content: contentType === "TEXT" ? textContent : null,
      sort_order: sortOrder,
      updated_at: new Date().toISOString(),
    })
    .eq("id", unitId);

  if (error) return { error: error.message };

  revalidatePath(`/admin/cursos/${courseId}`);
  revalidatePath(`/dashboard/biblioteca/${courseId}`);
  return {};
}

export async function deleteUnit(unitId: string, courseId: string): Promise<{ error?: string }> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };
  if (!unitId?.trim() || !courseId?.trim()) return { error: "ID inválido." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("CourseUnit").delete().eq("id", unitId.trim());
  if (error) return { error: error.message };
  revalidatePath(`/admin/cursos/${courseId}`);
  revalidatePath(`/dashboard/biblioteca/${courseId}`);
  return {};
}
