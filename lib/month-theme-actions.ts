"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentCoachId } from "@/lib/auth/get-current-coach";
import { getModalitiesForWeekThemeEditor } from "@/lib/coach-week-theme-modalities";

const YEAR_MONTH = /^\d{4}-\d{2}$/;

export type SaveMonthThemeResult = { error?: string; success?: true };

export async function saveMonthTheme(
  _prev: SaveMonthThemeResult | null,
  formData: FormData
): Promise<SaveMonthThemeResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || (dbUser.role !== "COACH" && dbUser.role !== "ADMIN")) {
    return { error: "Não autorizado." };
  }

  const modality = (formData.get("modality") as string)?.trim();
  const month = (formData.get("month") as string)?.trim();
  const titleRaw = (formData.get("title") as string)?.trim() ?? "";
  const title = titleRaw.length > 0 ? titleRaw : null;
  const descriptionRaw = (formData.get("description") as string)?.trim() ?? "";
  const description = descriptionRaw.length > 0 ? descriptionRaw.slice(0, 2000) : null;

  if (!modality) return { error: "Modalidade inválida." };
  if (!month || !YEAR_MONTH.test(month)) return { error: "Mês inválido." };

  const supabase = await createClient();
  const allowedModalities = await getModalitiesForWeekThemeEditor(supabase, dbUser.role, await getCurrentCoachId());
  if (!allowedModalities.includes(modality)) {
    return { error: "Não podes definir tema para esta modalidade." };
  }

  /** "YYYY-MM-01" construído por string, não via Date/toISOString — evita o desvio de fuso
   * (Lisboa é UTC+1/+2, `new Date(y,m,1).toISOString()` pode recuar um dia). */
  const monthStart = `${month}-01`;

  const { error } = await supabase
    .from("MonthTheme")
    .upsert({ modality, month_start: monthStart, title, description }, { onConflict: "modality,month_start" });

  if (error) {
    console.error("saveMonthTheme error:", error);
    return { error: error.message };
  }

  revalidatePath("/coach/tema-semana/mensal");
  revalidatePath("/admin/tema-semana");
  revalidatePath("/dashboard");
  return { success: true };
}
