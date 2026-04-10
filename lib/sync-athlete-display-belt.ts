import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getBeltIndexFromXp,
  getXpThresholdForBeltIndex,
  getMinCalendarDaysInBeltForNextPromotion,
} from "@/lib/belts";

export type AthleteBeltSyncRow = {
  xp: number;
  displayBeltIndex: number;
  lastBeltPromotionAt: string | null;
  createdAt: string;
};

/**
 * Promove displayBeltIndex quando o XP permite e já passou o tempo mínimo na faixa atual.
 * Deve ser chamado ao carregar o perfil e após ganhar XP.
 */
export async function syncAthleteDisplayBelt(
  supabase: SupabaseClient,
  athleteId: string
): Promise<AthleteBeltSyncRow | null> {
  const { data: row, error } = await supabase
    .from("Athlete")
    .select("xp, displayBeltIndex, lastBeltPromotionAt, createdAt")
    .eq("id", athleteId)
    .single();

  if (error || !row) return null;

  let displayIdx = (row.displayBeltIndex as number) ?? 0;
  const xp = (row.xp as number) ?? 0;
  let lastPromo = row.lastBeltPromotionAt
    ? new Date(row.lastBeltPromotionAt as string)
    : new Date(row.createdAt as string);
  const xpCap = getBeltIndexFromXp(xp);

  while (displayIdx < xpCap) {
    const needXp = getXpThresholdForBeltIndex(displayIdx + 1);
    if (xp < needXp) break;
    const minDays = getMinCalendarDaysInBeltForNextPromotion(displayIdx);
    const minMs = minDays * 86_400_000;
    if (Date.now() - lastPromo.getTime() < minMs) break;
    displayIdx++;
    lastPromo = new Date();
    await supabase
      .from("Athlete")
      .update({
        displayBeltIndex: displayIdx,
        lastBeltPromotionAt: lastPromo.toISOString(),
      })
      .eq("id", athleteId);
  }

  const { data: fresh } = await supabase
    .from("Athlete")
    .select("xp, displayBeltIndex, lastBeltPromotionAt, createdAt")
    .eq("id", athleteId)
    .single();

  if (!fresh) return null;

  return {
    xp: (fresh.xp as number) ?? 0,
    displayBeltIndex: (fresh.displayBeltIndex as number) ?? 0,
    lastBeltPromotionAt: (fresh.lastBeltPromotionAt as string | null) ?? null,
    createdAt: fresh.createdAt as string,
  };
}
