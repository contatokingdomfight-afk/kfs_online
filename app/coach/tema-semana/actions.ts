"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getWeekStartMonday, getWeekStartMondayForDate } from "@/lib/lesson-utils";

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
  const videoUrl = (formData.get("video_url") as string)?.trim() || null;
  const weekParam = (formData.get("week_start") as string)?.trim();

  if (!modality || !MODALITIES.includes(modality as (typeof MODALITIES)[number])) {
    return { error: "Modalidade inválida." };
  }
  if (!title) return { error: "Título do tema é obrigatório." };

  const weekStart = weekParam ? getWeekStartMondayForDate(new Date(weekParam)) : getWeekStartMonday();
  const supabase = await createClient();

  const { error } = await supabase.from("WeekTheme").upsert(
    {
      modality,
      week_start: weekStart,
      title,
      course_id: courseId || null,
      video_url: videoUrl,
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
