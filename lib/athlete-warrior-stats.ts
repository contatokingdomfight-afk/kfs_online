import { getRankFromAthleteState } from "@/lib/xp-missions";

/** Códigos de faixa alinhados a `belt_*` em i18n (12 níveis = índice `displayBeltIndex` típico). */
export const BELT_CODES = [
  "WHITE",
  "YELLOW",
  "ORANGE",
  "GREEN",
  "BLUE",
  "PURPLE",
  "BROWN",
  "BLACK",
  "BLACK_1",
  "BLACK_2",
  "BLACK_3",
  "GOLDEN",
] as const;

/**
 * A tabela `Athlete` tem `xp` e `displayBeltIndex`, não colunas `currentBelt`/`currentXP`.
 * Isto mapeia para o Painel do guerreiro (barra de XP dentro da faixa e código para tradução).
 */
export function getWarriorBeltBarFromAthleteState(
  xp: number,
  displayBeltIndex: number,
  lastBeltPromotionAt: string | null,
  createdAt: string
): { currentBelt: string; currentXP: number; nextLevelXP: number } {
  const rank = getRankFromAthleteState(
    Math.max(0, Math.floor(xp)),
    Math.max(0, displayBeltIndex),
    lastBeltPromotionAt,
    createdAt
  );
  const i = Math.min(Math.max(0, rank.rankIndex), BELT_CODES.length - 1);
  return {
    currentBelt: BELT_CODES[i] ?? "WHITE",
    currentXP: rank.xpCurrent,
    nextLevelXP: Math.max(1, rank.xpNext),
  };
}
