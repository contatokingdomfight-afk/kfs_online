import { XP_PER_MISSION } from "@/lib/xp-missions";

export type MissionListItem = {
  id: string;
  target: string;
  xpReward: number;
  progress: number;
};

type Axis = { id: string; label: string };

/**
 * Metas a partir do radar (dimensões abaixo do máximo) — ordem: mais baixo primeiro, até 3.
 * Espelha a lógica em `PerformanceFighterDashboard`.
 */
export function buildMissionsFromScores(
  scores: Record<string, number>,
  axes: readonly Axis[],
  maxScore: number
): MissionListItem[] {
  const entries = axes
    .map((a) => ({ id: a.id, label: a.label, score: scores[a.id] ?? 0 }))
    .filter((e) => e.score < maxScore)
    .sort((a, b) => a.score - b.score);
  return entries.slice(0, 3).map((e) => ({
    id: e.id,
    target: `Subir ${e.label} para ${Math.min(maxScore, Math.ceil(e.score) + 1)}`,
    xpReward: XP_PER_MISSION,
    progress: Math.min(100, (e.score / maxScore) * 100 + 15),
  }));
}
