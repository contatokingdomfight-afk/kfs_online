"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getWeekStartMonday } from "@/lib/lesson-utils";

const MODALITIES = ["MUAY_THAI", "BOXING", "KICKBOXING"] as const;

export type SaveWeekThemeResult = { error?: string };

export async function saveWeekTheme(
  _prev: SaveWeekThemeResult | null,
  formData: FormData
): Promise<SaveWeekThemeResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || (dbUser.role !== "COACH" && dbUser.role !== "ADMIN")) {
    return { error: "Não autorizado." };
  }

  const modality = (formData.get("modality") as string)?.trim();
  const title = (formData.get("title") as string)?.trim();
  const courseId = (formData.get("course_id") as string)?.trim() || null;

  if (!modality || !MODALITIES.includes(modality as (typeof MODALITIES)[number])) {
    return { error: "Modalidade inválida." };
  }
  if (!title) return { error: "Título do tema é obrigatório." };

  const weekStart = getWeekStartMonday();
  const supabase = await createClient();

  const { error } = await supabase.from("WeekTheme").upsert(
    {
      modality,
      week_start: weekStart,
      title,
      course_id: courseId,
    },
    { onConflict: "modality,week_start" }
  );

  if (error) {
    console.error("saveWeekTheme error:", error);
    return { error: error.message };
  }

  revalidatePath("/coach/tema-semana");
  revalidatePath("/coach");
  revalidatePath("/dashboard");
  return {};
}
