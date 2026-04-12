import type { SupabaseClient } from "@supabase/supabase-js";

export type LeaderboardRow = {
  rank: number;
  student_id: string;
  display_name: string;
  xp: number;
  athlete_id: string;
  is_current_user: boolean;
};

function mapRpcRow(row: Record<string, unknown>): LeaderboardRow {
  return {
    rank: Number(row.rank ?? 0),
    student_id: String(row.student_id ?? ""),
    display_name: String(row.display_name ?? ""),
    xp: Number(row.xp ?? 0),
    athlete_id: String(row.athlete_id ?? ""),
    is_current_user: Boolean(row.is_current_user),
  };
}

export type LeaderboardFilters = {
  /** Escola a listar; omitir ou null = escola do aluno autenticado. */
  schoolId?: string | null;
  /** Código de modalidade (`Student.primaryModality`); omitir = todas. */
  modality?: string | null;
  /** KIDS | TEENS | ADULTS | MASTERS; omitir = todas as idades. */
  ageBucket?: string | null;
};

/**
 * Ranking por XP com filtros opcionais (RPC `get_leaderboard_filtered`).
 * Escola em falta = escola do utilizador; requer migração aplicada no Supabase.
 */
export async function getFilteredSchoolLeaderboard(
  supabase: SupabaseClient,
  filters: LeaderboardFilters,
  limit = 100
): Promise<{ rows: LeaderboardRow[]; error: string | null }> {
  const { data, error } = await supabase.rpc("get_leaderboard_filtered", {
    p_school_id: filters.schoolId ?? null,
    p_modality: filters.modality ?? null,
    p_age_bucket: filters.ageBucket ?? null,
    p_limit: limit,
  });

  if (error) {
    return { rows: [], error: error.message };
  }

  const list = Array.isArray(data) ? data : [];
  return {
    rows: list.map((r) => mapRpcRow(r as Record<string, unknown>)),
    error: null,
  };
}

/**
 * Compatível com o comportamento anterior: só a escola do aluno, sem filtros de modalidade/idade.
 */
export async function getSchoolLeaderboard(
  supabase: SupabaseClient,
  limit = 100
): Promise<{ rows: LeaderboardRow[]; error: string | null }> {
  return getFilteredSchoolLeaderboard(supabase, {}, limit);
}
