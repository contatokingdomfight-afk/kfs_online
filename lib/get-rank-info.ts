import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { syncAthleteDisplayBelt } from "@/lib/sync-athlete-display-belt";
import { getRankFromAthleteState, type BeltTimeGateInfo } from "@/lib/xp-missions";

export type RankInfo = {
  level: number;
  rankIndex: number;
  rankName: string;
  xpCurrent: number;
  xpNext: number;
  beltTimeGate?: BeltTimeGateInfo;
};

export type AthleteRankState = {
  athleteId: string;
  xp: number;
  displayBeltIndex: number;
  rankInfo: RankInfo;
};

/** Sincroniza a faixa exibida e calcula nível/XP/faixa a partir do estado do atleta. */
export async function getRankInfoForStudent(
  supabase: SupabaseClient,
  studentId: string
): Promise<AthleteRankState | null> {
  const { data: athlete } = await supabase.from("Athlete").select("id, xp, createdAt").eq("studentId", studentId).single();
  if (!athlete) return null;

  const synced = await syncAthleteDisplayBelt(supabase, athlete.id);
  if (!synced) return null;

  const rank = getRankFromAthleteState(synced.xp, synced.displayBeltIndex, synced.lastBeltPromotionAt, synced.createdAt);
  return {
    athleteId: athlete.id,
    xp: synced.xp,
    displayBeltIndex: synced.displayBeltIndex,
    rankInfo: {
      level: rank.level,
      rankIndex: rank.rankIndex,
      rankName: rank.rankName,
      xpCurrent: rank.xpCurrent,
      xpNext: rank.xpNext,
      beltTimeGate: rank.beltTimeGate,
    },
  };
}
