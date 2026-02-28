import type { SupabaseClient } from "@supabase/supabase-js";

/** Retorna a segunda-feira da semana da data em YYYY-MM-DD (para agrupar por semana). */
export function getWeekKey(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay();
  const toMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(y, m - 1, d + toMonday);
  const my = monday.getFullYear();
  const mm = monday.getMonth() + 1;
  const md = monday.getDate();
  return `${my}-${String(mm).padStart(2, "0")}-${String(md).padStart(2, "0")}`;
}

export const BADGE_DEFINITIONS: Record<
  string,
  { name: string; description: string }
> = {
  FIRST_CLASS: { name: "Primeira aula", description: "Completaste a tua primeira aula" },
  CLASSES_5: { name: "5 aulas", description: "5 presenças confirmadas" },
  CLASSES_10: { name: "10 aulas", description: "10 presenças confirmadas" },
  CLASSES_25: { name: "25 aulas", description: "25 presenças confirmadas" },
  CLASSES_50: { name: "50 aulas", description: "50 presenças confirmadas" },
  WEEKS_3_STREAK: { name: "3 semanas seguidas", description: "Aulas em 3 semanas consecutivas" },
  MUAY_THAI_5: { name: "5 aulas de Muay Thai", description: "5 presenças em Muay Thai" },
  BOXING_5: { name: "5 aulas de Boxing", description: "5 presenças em Boxing" },
  KICKBOXING_5: { name: "5 aulas de Kickboxing", description: "5 presenças em Kickboxing" },
};

export type BadgeStats = {
  totalClasses: number;
  byModality: Record<string, number>;
  consecutiveWeeks: number;
};

/** Calcula totais e sequência de semanas a partir das presenças confirmadas. */
export async function computeBadgeStats(
  supabase: SupabaseClient,
  studentId: string
): Promise<BadgeStats> {
  const { data: attendances } = await supabase
    .from("Attendance")
    .select("lessonId")
    .eq("studentId", studentId)
    .eq("status", "CONFIRMED");
  if (!attendances?.length) {
    return { totalClasses: 0, byModality: {}, consecutiveWeeks: 0 };
  }

  const lessonIds = [...new Set(attendances.map((a) => a.lessonId))];
  const { data: lessons } = await supabase
    .from("Lesson")
    .select("id, date, modality")
    .in("id", lessonIds);

  const byModality: Record<string, number> = {};
  const weekSet = new Set<string>();
  (lessons ?? []).forEach((l) => {
    byModality[l.modality as string] = (byModality[l.modality as string] ?? 0) + 1;
    weekSet.add(getWeekKey(l.date));
  });

  const sortedWeeks = Array.from(weekSet).sort();
  let maxStreak = 0;
  let streak = 0;
  for (let i = 0; i < sortedWeeks.length; i++) {
    if (i === 0) {
      streak = 1;
    } else {
      const prev = new Date(sortedWeeks[i - 1]);
      const curr = new Date(sortedWeeks[i]);
      const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays <= 7) streak++;
      else streak = 1;
    }
    maxStreak = Math.max(maxStreak, streak);
  }

  return {
    totalClasses: lessons?.length ?? 0,
    byModality,
    consecutiveWeeks: maxStreak,
  };
}

/** Retorna os códigos de badges que o aluno já desbloqueou com base nas estatísticas. */
export function getEligibleBadgeCodes(stats: BadgeStats): string[] {
  const codes: string[] = [];
  if (stats.totalClasses >= 1) codes.push("FIRST_CLASS");
  if (stats.totalClasses >= 5) codes.push("CLASSES_5");
  if (stats.totalClasses >= 10) codes.push("CLASSES_10");
  if (stats.totalClasses >= 25) codes.push("CLASSES_25");
  if (stats.totalClasses >= 50) codes.push("CLASSES_50");
  if (stats.consecutiveWeeks >= 3) codes.push("WEEKS_3_STREAK");
  if ((stats.byModality["MUAY_THAI"] ?? 0) >= 5) codes.push("MUAY_THAI_5");
  if ((stats.byModality["BOXING"] ?? 0) >= 5) codes.push("BOXING_5");
  if ((stats.byModality["KICKBOXING"] ?? 0) >= 5) codes.push("KICKBOXING_5");
  return codes;
}

/** Atribui badges em falta ao aluno (idempotente). */
export async function grantBadgesIfEligible(
  supabase: SupabaseClient,
  studentId: string
): Promise<void> {
  const stats = await computeBadgeStats(supabase, studentId);
  const eligible = getEligibleBadgeCodes(stats);
  if (eligible.length === 0) return;

  const { data: existing } = await supabase
    .from("StudentBadge")
    .select("badgeCode")
    .eq("studentId", studentId);
  const have = new Set((existing ?? []).map((r) => r.badgeCode));
  const toInsert = eligible.filter((c) => !have.has(c));
  for (const code of toInsert) {
    await supabase.from("StudentBadge").insert({ studentId, badgeCode: code });
  }
}

export type EarnedBadge = {
  badgeCode: string;
  name: string;
  description: string;
  earnedAt: string;
};

/** Lista conquistas do aluno (com nomes e datas). */
export async function getEarnedBadges(
  supabase: SupabaseClient,
  studentId: string
): Promise<EarnedBadge[]> {
  await grantBadgesIfEligible(supabase, studentId);
  const { data: rows } = await supabase
    .from("StudentBadge")
    .select("badgeCode, earnedAt")
    .eq("studentId", studentId)
    .order("earnedAt", { ascending: false });
  return (rows ?? []).map((r) => {
    const def = BADGE_DEFINITIONS[r.badgeCode] ?? { name: r.badgeCode, description: "" };
    return {
      badgeCode: r.badgeCode,
      name: def.name,
      description: def.description,
      earnedAt: r.earnedAt,
    };
  });
}
