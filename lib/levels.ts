/**
 * Níveis numéricos infinitos a partir do XP total (regras de XP do admin).
 * Nível 1 começa em 0 XP; o nível N custa LEVEL_BASE_XP + LEVEL_STEP_XP·(N−1) — 250, 300, 350…
 * Sem trava de tempo nem cores: a graduação oficial por modalidade é outra coisa.
 */
export const LEVEL_BASE_XP = 250;
export const LEVEL_STEP_XP = 50;

/** XP total necessário para chegar ao nível `level` (nível 1 = 0). */
export function xpForLevel(level: number): number {
  const n = Math.max(0, Math.floor(level) - 1);
  return LEVEL_BASE_XP * n + (LEVEL_STEP_XP * n * (n - 1)) / 2;
}

export type LevelInfo = {
  level: number;
  /** XP total. */
  xp: number;
  /** XP já ganho dentro do nível atual. */
  xpIntoLevel: number;
  /** XP que o nível atual custa (até ao próximo). */
  xpForNext: number;
  /** XP total em que começa o próximo nível. */
  nextLevelAt: number;
};

export function levelFromXp(xpRaw: number): LevelInfo {
  const xp = Math.max(0, Math.floor(Number(xpRaw) || 0));
  // Resolve 25n² + 225n − xp ≥ 0 (n = nível − 1) e corrige arredondamentos.
  const a = LEVEL_STEP_XP / 2;
  const b = LEVEL_BASE_XP - LEVEL_STEP_XP / 2;
  let n = Math.floor((-b + Math.sqrt(b * b + 4 * a * xp)) / (2 * a));
  while (n > 0 && xpForLevel(n + 1) > xp) n--;
  while (xpForLevel(n + 2) <= xp) n++;
  const level = n + 1;
  const start = xpForLevel(level);
  const nextLevelAt = xpForLevel(level + 1);
  return { level, xp, xpIntoLevel: xp - start, xpForNext: nextLevelAt - start, nextLevelAt };
}
