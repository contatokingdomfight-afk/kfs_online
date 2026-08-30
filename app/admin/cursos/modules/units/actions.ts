"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertCourseUnitActor } from "@/lib/auth/course-unit-authorization";

export type UnitFormResult = { error?: string };

function parseContentType(raw: FormDataEntryValue | null): "VIDEO" | "TEXT" | "PDF" {
  if (raw === "TEXT") return "TEXT";
  if (raw === "PDF") return "PDF";
  return "VIDEO";
}

export async function createUnit(
  _prev: UnitFormResult | null,
  formData: FormData
): Promise<UnitFormResult> {
  const dbUser = await getCurrentDbUser();
  const moduleId = (formData.get("moduleId") as string)?.trim();
  const courseId = (formData.get("courseId") as string)?.trim();

  if (!moduleId || !courseId) return { error: "Módulo e curso são obrigatórios." };
  const actor = await assertCourseUnitActor(dbUser, courseId, moduleId);
  if (!actor.ok) return { error: actor.error };

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const contentType = parseContentType(formData.get("contentType"));
  const videoUrl = (formData.get("videoUrl") as string)?.trim() || null;
  const textContent = (formData.get("textContent") as string)?.trim() || null;
  const pdfUrl = (formData.get("pdfUrl") as string)?.trim() || null;
  const sortOrderStr = (formData.get("sortOrder") as string)?.trim();
  const status = (formData.get("status") as string) === "DRAFT" ? "DRAFT" : "PUBLISHED";

  if (!name) return { error: "Nome é obrigatório." };
  if (contentType === "VIDEO" && !videoUrl) return { error: "URL do vídeo é obrigatória para conteúdo em vídeo." };
  if (contentType === "TEXT" && !textContent) return { error: "Texto é obrigatório para conteúdo de leitura." };
  if (contentType === "PDF" && !pdfUrl) return { error: "Ficheiro PDF é obrigatório para conteúdo em PDF." };
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
    pdf_url: contentType === "PDF" ? pdfUrl : null,
    sort_order: sortOrder,
    status,
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
  const unitId = (formData.get("unitId") as string)?.trim();
  const moduleId = (formData.get("moduleId") as string)?.trim();
  const courseId = (formData.get("courseId") as string)?.trim();

  if (!unitId || !moduleId || !courseId) return { error: "Dados inválidos." };
  const actor = await assertCourseUnitActor(dbUser, courseId, moduleId);
  if (!actor.ok) return { error: actor.error };

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const contentType = parseContentType(formData.get("contentType"));
  const videoUrl = (formData.get("videoUrl") as string)?.trim() || null;
  const textContent = (formData.get("textContent") as string)?.trim() || null;
  const pdfUrl = (formData.get("pdfUrl") as string)?.trim() || null;
  const sortOrderStr = (formData.get("sortOrder") as string)?.trim();
  const status = (formData.get("status") as string) === "DRAFT" ? "DRAFT" : "PUBLISHED";

  if (!name) return { error: "Dados inválidos." };
  if (contentType === "VIDEO" && !videoUrl) return { error: "URL do vídeo é obrigatória para conteúdo em vídeo." };
  if (contentType === "TEXT" && !textContent) return { error: "Texto é obrigatório para conteúdo de leitura." };
  if (contentType === "PDF" && !pdfUrl) return { error: "Ficheiro PDF é obrigatório para conteúdo em PDF." };
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
      pdf_url: contentType === "PDF" ? pdfUrl : null,
      sort_order: sortOrder,
      status,
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
