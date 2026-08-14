/**
 * Cores hex por código de faixa — antes duplicado dentro de `WarriorPanel.tsx`.
 * Usado no selo da faixa (home) e na faixa visível do avatar customizável
 * (`lib/avatar-cosmetics.ts`, `components/avatar/Cosmetics.tsx`).
 */
import { BELT_CODES } from "./athlete-warrior-stats";
import { getBeltIndexFromXp } from "./belts";

export const BELT_COLORS: Record<string, string> = {
  WHITE: "#e5e5e5",
  YELLOW: "#facc15",
  ORANGE: "#f97316",
  GREEN: "#22c55e",
  BLUE: "#3b82f6",
  PURPLE: "#a855f7",
  BROWN: "#92400e",
  BLACK: "#1f2937",
  BLACK_1: "#1f2937",
  BLACK_2: "#1f2937",
  BLACK_3: "#1f2937",
  GOLDEN: "#f59e0b",
};

const FALLBACK_COLOR = "var(--primary)";

/** Cor da faixa a partir do código (ex.: "BLUE"). */
export function getBeltColorForCode(code: string | null | undefined): string {
  if (!code) return FALLBACK_COLOR;
  return BELT_COLORS[code] ?? FALLBACK_COLOR;
}

/** Cor da faixa a partir do XP total (deriva o índice/código internamente). */
export function getBeltColorForXp(xp: number): string {
  const index = Math.min(Math.max(0, getBeltIndexFromXp(xp)), BELT_CODES.length - 1);
  return getBeltColorForCode(BELT_CODES[index]);
}
