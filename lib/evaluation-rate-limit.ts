import type { SupabaseClient } from "@supabase/supabase-js";
import { toDate } from "date-fns-tz";
import { LISBON_TZ } from "@/lib/lisbon-payment-dates";
import { calendarDateLisbon } from "@/lib/lesson-check-in-window";

/**
 * Anti-abuso: no máximo 1 `AthleteEvaluation` por atleta+modalidade por dia civil de Lisboa —
 * evita spam de avaliações usado para inflar artificialmente o ranking por evolução ou as
 * missões de XP (ver lib/rank-evolution.ts, lib/xp-missions.ts).
 * Sem `modality` (caminho legado de app/coach/atletas/actions.ts) não há limite — gap aceite,
 * ver DOCS/ROADMAP_Plataforma_KFS.md (Rank v2).
 */
export async function assertEvaluationNotRateLimited(
  supabase: SupabaseClient,
  athleteId: string,
  modality: string | null
): Promise<{ error?: string }> {
  if (!modality) return {};

  const today = calendarDateLisbon(new Date());
  const startOfDayIso = toDate(`${today}T00:00:00`, { timeZone: LISBON_TZ }).toISOString();

  const { data } = await supabase
    .from("AthleteEvaluation")
    .select("id")
    .eq("athleteId", athleteId)
    .eq("modality", modality)
    .gte("created_at", startOfDayIso)
    .limit(1)
    .maybeSingle();

  if (data) {
    return { error: "Já existe uma avaliação registada hoje para esta modalidade. Tenta novamente amanhã." };
  }
  return {};
}
