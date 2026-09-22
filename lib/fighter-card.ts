import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getRankInfoForStudent } from "@/lib/get-rank-info";
import { computeBadgeStats, getBadgeDefinition } from "@/lib/gamification";
import { getBeltName } from "@/lib/belts";
import { MODALITY_LABELS } from "@/lib/lesson-utils";

export { FIGHTER_CARD_KIDS_MAX_AGE, calculateAge, isFighterCardEligibleAge } from "@/lib/fighter-card-age";
import { isFighterCardEligibleAge } from "@/lib/fighter-card-age";

export type FighterCardData = {
  studentId: string;
  name: string;
  avatarUrl: string | null;
  beltName: string;
  primaryModalityLabel: string | null;
  xp: number;
  totalClasses: number;
  consecutiveWeeks: number;
  memberSinceLabel: string;
  badges: { code: string; name: string }[];
};

export type FighterCardResult =
  | { ok: true; data: FighterCardData }
  | { ok: false; reason: "not_found" | "not_public" | "not_active" | "kids" };

const MONTH_LABELS_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function memberSinceLabel(createdAt: string | null | undefined): string {
  if (!createdAt) return "";
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return "";
  return `${MONTH_LABELS_PT[d.getMonth()]} de ${d.getFullYear()}`;
}

/**
 * Dados do Fighter Card de um aluno — usado pela página pública e pela rota de imagem.
 * Aplica sempre as regras de elegibilidade no servidor (não confiar só no toggle gravado):
 * só alunos `ATIVO`, com `fighterCardPublic = true` e fora da faixa etária Kids.
 */
export async function getFighterCardData(
  supabase: SupabaseClient,
  studentId: string
): Promise<FighterCardResult> {
  const { data: student } = await supabase
    .from("Student")
    .select("id, userId, status, primaryModality, createdAt")
    .eq("id", studentId)
    .maybeSingle();
  if (!student) return { ok: false, reason: "not_found" };
  if (student.status !== "ATIVO") return { ok: false, reason: "not_active" };

  const { data: profile } = await supabase
    .from("StudentProfile")
    .select("dateOfBirth, fighterCardPublic")
    .eq("studentId", studentId)
    .maybeSingle();
  if (!profile?.fighterCardPublic) return { ok: false, reason: "not_public" };
  if (!isFighterCardEligibleAge((profile as { dateOfBirth?: string | null }).dateOfBirth)) {
    return { ok: false, reason: "kids" };
  }

  const { data: user } = await supabase
    .from("User")
    .select("name, avatarUrl")
    .eq("id", student.userId)
    .maybeSingle();

  const [rankInfo, stats, badgeRows] = await Promise.all([
    getRankInfoForStudent(supabase, studentId),
    computeBadgeStats(supabase, studentId),
    supabase
      .from("StudentBadge")
      .select("badgeCode, earnedAt")
      .eq("studentId", studentId)
      .order("earnedAt", { ascending: false })
      .limit(4),
  ]);

  const badges = (badgeRows.data ?? []).map((b) => ({
    code: b.badgeCode as string,
    name: getBadgeDefinition(b.badgeCode as string).name,
  }));

  const primaryModality = (student as { primaryModality?: string | null }).primaryModality ?? null;

  return {
    ok: true,
    data: {
      studentId,
      name: (user as { name?: string | null } | null)?.name?.trim() || "Aluno Kingdom",
      avatarUrl: (user as { avatarUrl?: string | null } | null)?.avatarUrl ?? null,
      beltName: getBeltName(rankInfo?.displayBeltIndex ?? 0),
      primaryModalityLabel: primaryModality ? (MODALITY_LABELS[primaryModality] ?? primaryModality) : null,
      xp: rankInfo?.xp ?? 0,
      totalClasses: stats.totalClasses,
      consecutiveWeeks: stats.consecutiveWeeks,
      memberSinceLabel: memberSinceLabel(student.createdAt as string | null),
      badges,
    },
  };
}
