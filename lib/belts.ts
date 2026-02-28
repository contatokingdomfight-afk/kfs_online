/**
 * Sistema de faixas/cores (Branca → Dourado N).
 * Para subir de cor, o atleta precisa acumular o dobro do XP que acumulou na cor anterior.
 * Primeira subida (Branca → Branca/amarela): 1000 XP.
 */

/** Nomes das faixas até Preta/Dourado; depois "Dourado 1", "Dourado 2", ... */
export const BELT_NAMES = [
  "Branca",
  "Branca/amarela",
  "Amarela",
  "Amarela/verde",
  "Verde",
  "Verde/azul",
  "Azul",
  "Azul/vermelha",
  "Vermelha",
  "Vermelha/preta",
  "Preta",
  "Preta/Dourado",
] as const;

/** XP acumulada mínima para estar na faixa de índice k: 1000 * (2^k - 1). */
export function getXpThresholdForBeltIndex(beltIndex: number): number {
  if (beltIndex <= 0) return 0;
  return 1000 * (Math.pow(2, beltIndex) - 1);
}

/**
 * Devolve o índice da faixa (0 = Branca, 11 = Preta/Dourado, 12+ = Dourado 1, 2, ...)
 * dado o XP total. Fórmula: threshold(k) <= xp < threshold(k+1) => k = floor(log2(xp/1000 + 1)).
 */
export function getBeltIndexFromXp(xp: number): number {
  const x = Math.max(0, Math.floor(xp));
  if (x === 0) return 0;
  const t = x / 1000 + 1;
  return Math.floor(Math.log2(t));
}

/**
 * Nome da faixa para um índice (12+ = "Dourado 1", "Dourado 2", ...).
 */
export function getBeltName(beltIndex: number): string {
  if (beltIndex < BELT_NAMES.length) return BELT_NAMES[beltIndex] ?? "Branca";
  return `Dourado ${beltIndex - 11}`;
}

export type BeltInfo = {
  beltIndex: number;
  beltName: string;
  /** XP dentro da faixa atual (para a barra). */
  xpCurrent: number;
  /** XP necessária nesta faixa para subir (para a barra). */
  xpNext: number;
  /** Nível numérico (1-based) para exibição. */
  level: number;
};

/**
 * Calcula faixa, progresso e XP atual/next a partir do XP total.
 */
export function getBeltFromXp(xp: number): BeltInfo {
  const xpVal = Math.max(0, Math.floor(xp));
  const beltIndex = getBeltIndexFromXp(xpVal);
  const beltName = getBeltName(beltIndex);
  const thresholdCurrent = getXpThresholdForBeltIndex(beltIndex);
  const thresholdNext = getXpThresholdForBeltIndex(beltIndex + 1);
  const xpCurrent = xpVal - thresholdCurrent;
  const xpNext = thresholdNext - thresholdCurrent;

  return {
    beltIndex,
    beltName,
    xpCurrent,
    xpNext,
    level: beltIndex + 1,
  };
}
