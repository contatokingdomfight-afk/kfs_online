"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";

const CATEGORIES = ["TECHNIQUE", "MINDSET", "PERFORMANCE"] as const;

export type CourseFormResult = { error?: string };

export async function createCourse(
  _prev: CourseFormResult | null,
  formData: FormData
): Promise<CourseFormResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const category = (formData.get("category") as string)?.trim() || "TECHNIQUE";
  const modality = (formData.get("modality") as string)?.trim() || null;
  const includedInDigital = formData.get("included_in_digital_plan") === "on" || formData.get("included_in_digital_plan") === "true";
  const videoUrl = (formData.get("video_url") as string)?.trim() || null;
  const sortOrderStr = (formData.get("sort_order") as string)?.trim();
  const isActive = formData.get("is_active") !== "off" && formData.get("is_active") !== "false";
  const availableForPurchase = formData.get("available_for_purchase") === "on" || formData.get("available_for_purchase") === "true";
  const priceStr = (formData.get("price") as string)?.trim();
  const price = priceStr ? parseFloat(priceStr) : null;
  const priceNum = price != null && !isNaN(price) && price >= 0 ? price : null;

  if (!name) return { error: "Nome do curso é obrigatório." };
  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) return { error: "Categoria inválida." };
  const sortOrder = sortOrderStr ? parseInt(sortOrderStr, 10) : 0;
  if (isNaN(sortOrder)) return { error: "Ordem deve ser um número." };

  const supabase = createAdminClient();
  const id = crypto.randomUUID();

  const { error } = await supabase.from("Course").insert({
    id,
    name,
    description,
    category,
    modality,
    included_in_digital_plan: includedInDigital,
    video_url: videoUrl,
    sort_order: sortOrder,
    is_active: isActive,
    available_for_purchase: availableForPurchase,
    price: priceNum,
  });

  if (error) {
    console.error("createCourse error:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/cursos");
  redirect("/admin/cursos");
}

export async function updateCourse(
  _prev: CourseFormResult | null,
  formData: FormData
): Promise<CourseFormResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const courseId = (formData.get("courseId") as string)?.trim();
  if (!courseId) return { error: "ID do curso inválido." };

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const category = (formData.get("category") as string)?.trim() || "TECHNIQUE";
  const modality = (formData.get("modality") as string)?.trim() || null;
  const includedInDigital = formData.get("included_in_digital_plan") === "on" || formData.get("included_in_digital_plan") === "true";
  const videoUrl = (formData.get("video_url") as string)?.trim() || null;
  const sortOrderStr = (formData.get("sort_order") as string)?.trim();
  const isActive = formData.get("is_active") !== "off" && formData.get("is_active") !== "false";
  const availableForPurchase = formData.get("available_for_purchase") === "on" || formData.get("available_for_purchase") === "true";
  const priceStr = (formData.get("price") as string)?.trim();
  const price = priceStr ? parseFloat(priceStr) : null;
  const priceNum = price != null && !isNaN(price) && price >= 0 ? price : null;

  if (!name) return { error: "Nome do curso é obrigatório." };
  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) return { error: "Categoria inválida." };
  const sortOrder = sortOrderStr ? parseInt(sortOrderStr, 10) : 0;
  if (isNaN(sortOrder)) return { error: "Ordem deve ser um número." };

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("Course")
    .update({
      name,
      description,
      category,
      modality,
      included_in_digital_plan: includedInDigital,
      video_url: videoUrl,
      sort_order: sortOrder,
      is_active: isActive,
      available_for_purchase: availableForPurchase,
      price: priceNum,
    })
    .eq("id", courseId);

  if (error) return { error: error.message };

  revalidatePath("/admin/cursos");
  revalidatePath(`/admin/cursos/${courseId}`);
  revalidatePath("/dashboard/biblioteca");
  return {};
}

export async function deleteCourse(courseId: string): Promise<{ error?: string }> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };
  if (!courseId?.trim()) return { error: "ID do curso inválido." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("Course").delete().eq("id", courseId.trim());
  if (error) return { error: error.message };
  revalidatePath("/admin/cursos");
  revalidatePath("/dashboard/biblioteca");
  redirect("/admin/cursos");
}
