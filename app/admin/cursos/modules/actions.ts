"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";

export type ModuleFormResult = { error?: string };

export async function createModule(
  _prev: ModuleFormResult | null,
  formData: FormData
): Promise<ModuleFormResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const courseId = (formData.get("courseId") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const videoUrl = (formData.get("videoUrl") as string)?.trim() || null;
  const sortOrderStr = (formData.get("sortOrder") as string)?.trim();

  if (!courseId || !name) return { error: "Curso e nome do módulo são obrigatórios." };
  const sortOrder = sortOrderStr ? parseInt(sortOrderStr, 10) : 0;
  if (isNaN(sortOrder)) return { error: "Ordem deve ser um número." };

  const supabase = createAdminClient();
  const id = crypto.randomUUID();

  const { error } = await supabase.from("CourseModule").insert({
    id,
    course_id: courseId,
    name,
    description,
    video_url: videoUrl,
    sort_order: sortOrder,
  });

  if (error) {
    console.error("createModule error:", error);
    return { error: error.message };
  }

  revalidatePath(`/admin/cursos/${courseId}`);
  revalidatePath(`/dashboard/biblioteca/${courseId}`);
  return {};
}

export async function updateModule(
  _prev: ModuleFormResult | null,
  formData: FormData
): Promise<ModuleFormResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const moduleId = (formData.get("moduleId") as string)?.trim();
  const courseId = (formData.get("courseId") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const videoUrl = (formData.get("videoUrl") as string)?.trim() || null;
  const sortOrderStr = (formData.get("sortOrder") as string)?.trim();

  if (!moduleId || !courseId || !name) return { error: "Dados inválidos." };
  const sortOrder = sortOrderStr ? parseInt(sortOrderStr, 10) : 0;
  if (isNaN(sortOrder)) return { error: "Ordem deve ser um número." };

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("CourseModule")
    .update({ name, description, video_url: videoUrl, sort_order: sortOrder, updated_at: new Date().toISOString() })
    .eq("id", moduleId);

  if (error) return { error: error.message };

  revalidatePath(`/admin/cursos/${courseId}`);
  revalidatePath(`/dashboard/biblioteca/${courseId}`);
  return {};
}

export async function deleteModule(moduleId: string, courseId: string): Promise<{ error?: string }> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };
  if (!moduleId?.trim() || !courseId?.trim()) return { error: "ID inválido." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("CourseModule").delete().eq("id", moduleId.trim());
  if (error) return { error: error.message };
  revalidatePath(`/admin/cursos/${courseId}`);
  revalidatePath(`/dashboard/biblioteca/${courseId}`);
  return {};
}
