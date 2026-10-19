import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { BeltTimeGateInfo } from "@/lib/xp-missions";
import { loadStudentLevel } from "@/lib/student-xp-total";

export type RankInfo = {
  level: number;
  /** Índice do nível (nível − 1). Já não é uma faixa de cor. */
  rankIndex: number;
  /** «Nível N». */
  rankName: string;
  xpCurrent: number;
  xpNext: number;
  /** Já não há trava de tempo no nível geral; mantido por compatibilidade (sempre undefined). */
  beltTimeGate?: BeltTimeGateInfo;
};

export type AthleteRankState = {
  athleteId: string;
  /** XP total oficial (regras de XP do admin). */
  xp: number;
  /** Índice do nível (nível − 1), por compatibilidade. */
  displayBeltIndex: number;
  rankInfo: RankInfo;
};

/**
 * Nível geral do aluno: numérico e infinito, calculado só a partir do XP total oficial
 * (vista `StudentXpEvent`). Ver lib/levels.ts.
 */
export async function getRankInfoForStudent(
  supabase: SupabaseClient,
  studentId: string
): Promise<AthleteRankState | null> {
  const { data: athlete } = await supabase.from("Athlete").select("id").eq("studentId", studentId).maybeSingle();
  if (!athlete) return null;

  const lv = await loadStudentLevel(supabase, studentId);
  return {
    athleteId: (athlete as { id: string }).id,
    xp: lv.xp,
    displayBeltIndex: lv.level - 1,
    rankInfo: {
      level: lv.level,
      rankIndex: lv.level - 1,
      rankName: `Nível ${lv.level}`,
      xpCurrent: lv.xpIntoLevel,
      xpNext: lv.xpForNext,
    },
  };
}
