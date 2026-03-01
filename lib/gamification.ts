import type { SupabaseClient } from "@supabase/supabase-js";
import { MODALITY_LABELS } from "@/lib/lesson-utils";

/** Modalidades que têm badges por aula. Derivado de MODALITY_LABELS. */
export const GAMIFICATION_MODALITIES = Object.keys(MODALITY_LABELS) as string[];

/** Regra: até 100 de 10 em 10, depois de 50 em 50 (150, 200, 250, ...). Gera automaticamente sem limite. */
function getModalityThresholdsUpTo(count: number): number[] {
  const thresholds: number[] = [];
  for (let t = 10; t <= Math.min(100, count); t += 10) thresholds.push(t);
  for (let t = 150; t <= count; t += 50) thresholds.push(t);
  return thresholds;
}

/** Próximo threshold após count (10→10, 9→10, 100→150, 175→200, etc.). */
function getNextModalityThreshold(count: number): number {
  if (count < 10) return 10;
  if (count < 100) return Math.floor(count / 10) * 10 + 10;
  return Math.floor(count / 50) * 50 + 50;
}

/** Gera definição de badge por modalidade dinamicamente (ex: MUAY_THAI_150 → "150 aulas de Muay Thai"). */
function getModalityBadgeDefinition(code: string): { name: string; description: string } | null {
  const match = code.match(/^(.+)_(\d+)$/);
  if (!match) return null;
  const [, mod, num] = match;
  const threshold = parseInt(num, 10);
  if (!GAMIFICATION_MODALITIES.includes(mod)) return null;
  const label = MODALITY_LABELS[mod] ?? mod;
  return {
    name: `${threshold} aulas de ${label}`,
    description: `${threshold} presenças em ${label}`,
  };
}

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

/** Badges fixos (total, semanas). */
const FIXED_THRESHOLDS: Array<
  | { code: string; type: "total"; threshold: number }
  | { code: string; type: "weeks"; threshold: number }
> = [
  { code: "FIRST_CLASS", type: "total", threshold: 1 },
  { code: "CLASSES_5", type: "total", threshold: 5 },
  { code: "CLASSES_10", type: "total", threshold: 10 },
  { code: "CLASSES_25", type: "total", threshold: 25 },
  { code: "CLASSES_50", type: "total", threshold: 50 },
  { code: "CLASSES_100", type: "total", threshold: 100 },
  { code: "WEEKS_3_STREAK", type: "weeks", threshold: 3 },
  { code: "WEEKS_5_STREAK", type: "weeks", threshold: 5 },
];

const FIXED_DEFINITIONS: Record<string, { name: string; description: string }> = {
  FIRST_CLASS: { name: "Primeira aula", description: "Completaste a tua primeira aula" },
  CLASSES_5: { name: "5 aulas", description: "5 presenças confirmadas" },
  CLASSES_10: { name: "10 aulas", description: "10 presenças confirmadas" },
  CLASSES_25: { name: "25 aulas", description: "25 presenças confirmadas" },
  CLASSES_50: { name: "50 aulas", description: "50 presenças confirmadas" },
  CLASSES_100: { name: "100 aulas", description: "100 presenças confirmadas" },
  WEEKS_3_STREAK: { name: "3 semanas seguidas", description: "Aulas em 3 semanas consecutivas" },
  WEEKS_5_STREAK: { name: "5 semanas seguidas", description: "Aulas em 5 semanas consecutivas" },
};

/** Badges fixos (total, semanas). Badges por modalidade são gerados dinamicamente. */
export const BADGE_THRESHOLDS = FIXED_THRESHOLDS;

/** Retorna definição de badge (fixos ou modalidade gerada dinamicamente). */
export function getBadgeDefinition(code: string): { name: string; description: string } {
  const fixed = FIXED_DEFINITIONS[code];
  if (fixed) return fixed;
  const modality = getModalityBadgeDefinition(code);
  return modality ?? { name: code, description: "" };
}

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
  for (const b of BADGE_THRESHOLDS) {
    if (b.type === "total" && stats.totalClasses >= b.threshold) codes.push(b.code);
    else if (b.type === "weeks" && stats.consecutiveWeeks >= b.threshold) codes.push(b.code);
  }
  for (const mod of GAMIFICATION_MODALITIES) {
    const count = stats.byModality[mod] ?? 0;
    for (const t of getModalityThresholdsUpTo(count)) {
      codes.push(`${mod}_${t}`);
    }
  }
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

export type NextBadgeProgress = {
  badgeCode: string;
  name: string;
  description: string;
  current: number;
  target: number;
  progressPct: number;
} | null;

/** Retorna a próxima conquista a desbloquear e o progresso atual. */
export async function getNextBadgeProgress(
  supabase: SupabaseClient,
  studentId: string
): Promise<NextBadgeProgress> {
  const stats = await computeBadgeStats(supabase, studentId);
  const { data: existing } = await supabase
    .from("StudentBadge")
    .select("badgeCode")
    .eq("studentId", studentId);
  const have = new Set((existing ?? []).map((r) => r.badgeCode));

  for (const b of BADGE_THRESHOLDS) {
    if (have.has(b.code)) continue;
    let current = 0;
    let target = b.threshold;
    if (b.type === "total") current = stats.totalClasses;
    else if (b.type === "weeks") current = stats.consecutiveWeeks;
    const def = getBadgeDefinition(b.code);
    return {
      badgeCode: b.code,
      name: def.name,
      description: def.description,
      current,
      target,
      progressPct: target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0,
    };
  }

  const modalityCandidates: { code: string; current: number; target: number }[] = [];
  for (const mod of GAMIFICATION_MODALITIES) {
    const current = stats.byModality[mod] ?? 0;
    const target = getNextModalityThreshold(current);
    const code = `${mod}_${target}`;
    if (!have.has(code)) modalityCandidates.push({ code, current, target });
  }
  const next = modalityCandidates.sort((a, b) => a.target - b.target)[0];
  if (!next) return null;
  const def = getBadgeDefinition(next.code);
  return {
    badgeCode: next.code,
    name: def.name,
    description: def.description,
    current: next.current,
    target: next.target,
    progressPct: next.target > 0 ? Math.min(100, Math.round((next.current / next.target) * 100)) : 0,
  };
}

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
    const def = getBadgeDefinition(r.badgeCode);
    return {
      badgeCode: r.badgeCode,
      name: def.name,
      description: def.description,
      earnedAt: r.earnedAt,
    };
  });
}
