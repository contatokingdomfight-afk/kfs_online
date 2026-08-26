"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentCoachId } from "@/lib/auth/get-current-coach";
import { getWeekStartMondayForDateInLisbon, getWeekStartMondayLisbon } from "@/lib/lisbon-week";
import { getModalitiesForWeekThemeEditor } from "@/lib/coach-week-theme-modalities";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

const MODALITIES = ["MUAY_THAI", "BOXING", "KICKBOXING", "MMA"] as const;

export type SaveWeekThemeResult = { error?: string; success?: true };

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
  const descriptionRaw = (formData.get("description") as string)?.trim() ?? "";
  const description = descriptionRaw.length > 0 ? descriptionRaw.slice(0, 2000) : null;
  const courseId = (formData.get("course_id") as string)?.trim() || null;
  const unitIdRaw = (formData.get("unit_id") as string)?.trim() || null;
  const unitId = courseId ? unitIdRaw : null;
  const videoUrl = (formData.get("video_url") as string)?.trim() || null;
  const weekParam = (formData.get("week_start") as string)?.trim();

  if (!modality || !MODALITIES.includes(modality as (typeof MODALITIES)[number])) {
    return { error: "Modalidade inválida." };
  }
  if (!title) return { error: "Título do tema é obrigatório." };

  const supabase = await createClient();
  const allowedModalities = await getModalitiesForWeekThemeEditor(supabase, dbUser.role, await getCurrentCoachId());
  if (!allowedModalities.includes(modality)) {
    return { error: "Não podes definir tema para esta modalidade." };
  }

  const weekStart =
    weekParam && YMD.test(weekParam) ? getWeekStartMondayForDateInLisbon(weekParam) : getWeekStartMondayLisbon();

  const { error } = await supabase.from("WeekTheme").upsert(
    {
      modality,
      week_start: weekStart,
      title,
      description,
      course_id: courseId || null,
      unit_id: unitId,
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
  revalidatePath("/coach/aula");
  revalidatePath("/dashboard");
  return { success: true };
}
