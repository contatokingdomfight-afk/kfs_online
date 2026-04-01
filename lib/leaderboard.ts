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

/**
 * Ranking por XP na escola do utilizador (RPC `get_leaderboard_my_school`).
 * Requer migração aplicada no Supabase.
 */
export async function getSchoolLeaderboard(
  supabase: SupabaseClient,
  limit = 100
): Promise<{ rows: LeaderboardRow[]; error: string | null }> {
  const { data, error } = await supabase.rpc("get_leaderboard_my_school", {
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
