/**
 * Conquistas / badges gamificados.
 * Define a lista de conquistas e a lógica para saber se estão desbloqueadas.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getBeltIndexFromXp } from "@/lib/belts";
import { computeBadgeStats } from "@/lib/gamification";

export type AchievementConditionType =
  | "first_mission"
  | "first_physical_assessment"
  | "missions_completed"
  | "belt_level"
  | "xp_milestone"
  | "streak_days"
  | "classes_total"
  | "weeks_streak";

export type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: AchievementConditionType;
  /** Parâmetro da condição (ex.: 100000 para xp_milestone, 4 para belt_level Verde). */
  conditionParam?: number;
  xpReward: number;
};

/** Conquistas principais (progressão, faixas, marcos). */
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "primeiros_passos",
    name: "Primeiros Passos",
    description: "Completa a primeira missão",
    icon: "🎯",
    condition: "first_mission",
    xpReward: 25,
  },
  {
    id: "primeira_avaliacao_fisica",
    name: "Primeira Avaliação Física",
    description: "Realizar a primeira avaliação física",
    icon: "🏅",
    condition: "first_physical_assessment",
    xpReward: 50,
  },
  {
    id: "10_missoes",
    name: "10 Missões Concluídas",
    description: "Completar 10 missões",
    icon: "⭐",
    condition: "missions_completed",
    conditionParam: 10,
    xpReward: 100,
  },
  {
    id: "faixa_verde",
    name: "Faixa Verde",
    description: "Atingir a faixa verde",
    icon: "🟢",
    condition: "belt_level",
    conditionParam: 4, // índice da faixa Verde
    xpReward: 75,
  },
  {
    id: "faixa_azul",
    name: "Faixa Azul",
    description: "Atingir a faixa azul",
    icon: "🔵",
    condition: "belt_level",
    conditionParam: 6, // índice da faixa Azul
    xpReward: 100,
  },
  {
    id: "xp_100k",
    name: "100 000 XP",
    description: "Acumular 100k XP",
    icon: "💎",
    condition: "xp_milestone",
    conditionParam: 100_000,
    xpReward: 150,
  },
  {
    id: "atleta_consistente",
    name: "Atleta Consistente",
    description: "Completar missões durante 7 dias seguidos",
    icon: "🔥",
    condition: "streak_days",
    conditionParam: 7,
    xpReward: 80,
  },
  {
    id: "elite",
    name: "Elite",
    description: "Atingir Faixa Preta",
    icon: "⚫",
    condition: "belt_level",
    conditionParam: 10, // índice da faixa Preta
    xpReward: 200,
  },
  {
    id: "lenda",
    name: "Lenda",
    description: "Atingir Faixa Dourada",
    icon: "✨",
    condition: "belt_level",
    conditionParam: 11, // Preta/Dourado
    xpReward: 300,
  },
];

export type AchievementWithStatus = Achievement & {
  isUnlocked: boolean;
  earnedAt?: string | null;
};

export type AchievementUnlockContext = {
  studentId: string;
  athleteXp: number;
  hasPhysicalAssessment: boolean;
  missionsCompletedCount: number;
  streakDays: number;
  totalClasses: number;
  consecutiveWeeks: number;
};

/** Calcula quais conquistas estão desbloqueadas com base no contexto. */
export function getAchievementsWithStatus(
  context: AchievementUnlockContext
): AchievementWithStatus[] {
  const beltIndex = getBeltIndexFromXp(context.athleteXp);

  return ACHIEVEMENTS.map((a) => {
    let isUnlocked = false;
    switch (a.condition) {
      case "first_mission":
        isUnlocked = context.missionsCompletedCount >= 1;
        break;
      case "first_physical_assessment":
        isUnlocked = context.hasPhysicalAssessment;
        break;
      case "missions_completed":
        isUnlocked = context.missionsCompletedCount >= (a.conditionParam ?? 10);
        break;
      case "belt_level":
        isUnlocked = beltIndex >= (a.conditionParam ?? 0);
        break;
      case "xp_milestone":
        isUnlocked = context.athleteXp >= (a.conditionParam ?? 0);
        break;
      case "streak_days":
        isUnlocked = context.streakDays >= (a.conditionParam ?? 7);
        break;
      case "classes_total":
        isUnlocked = context.totalClasses >= (a.conditionParam ?? 1);
        break;
      case "weeks_streak":
        isUnlocked = context.consecutiveWeeks >= (a.conditionParam ?? 3);
        break;
      default:
        break;
    }
    return { ...a, isUnlocked };
  });
}

/** Busca o contexto do atleta para calcular conquistas (para uso na página). */
export async function getAchievementUnlockContext(
  supabase: SupabaseClient,
  studentId: string
): Promise<AchievementUnlockContext> {
  const [athleteResult, physicalResult, stats] = await Promise.all([
    supabase.from("Athlete").select("xp").eq("studentId", studentId).single(),
    supabase
      .from("StudentPhysicalAssessment")
      .select("id")
      .eq("studentId", studentId)
      .limit(1)
      .maybeSingle(),
    computeBadgeStats(supabase, studentId),
  ]);

  const xp = (athleteResult.data?.xp as number | null) ?? 0;
  const hasPhysicalAssessment = physicalResult.data != null;
  const totalClasses = stats.totalClasses;
  const consecutiveWeeks = stats.consecutiveWeeks;

  const missionsCompletedCount = totalClasses;
  const streakDays = 0;

  return {
    studentId,
    athleteXp: xp,
    hasPhysicalAssessment,
    missionsCompletedCount,
    streakDays,
    totalClasses,
    consecutiveWeeks,
  };
}
