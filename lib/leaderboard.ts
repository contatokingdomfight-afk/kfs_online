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

/** PostgREST quando a função ainda não foi criada / não está no schema cache. */
function isMissingGetLeaderboardFilteredRpc(error: {
  message?: string;
  code?: string;
}): boolean {
  const m = (error.message ?? "").toLowerCase();
  return (
    m.includes("get_leaderboard_filtered") &&
    (m.includes("could not find the function") || m.includes("schema cache"))
  );
}

/**
 * Legacy: só a escola do utilizador, sem filtros de modalidade/idade.
 * Usado em produção se `get_leaderboard_filtered` ainda não foi aplicada na BD.
 */
async function fetchLeaderboardMySchool(
  supabase: SupabaseClient,
  limit: number
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

function canFallbackToMySchoolOnly(
  filters: LeaderboardFilters,
  mySchoolId: string | null | undefined
): boolean {
  if (filters.modality || filters.ageBucket) return false;
  const sid = filters.schoolId;
  if (sid == null || sid === "") return true;
  if (!mySchoolId) return false;
  return sid === mySchoolId;
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
 * Escola em falta = escola do utilizador.
 *
 * Se a migração `20260412120000_leaderboard_filtered_rpc.sql` não estiver na BD,
 * faz fallback para `get_leaderboard_my_school` quando os filtros forem só a escola
 * do aluno (sem modalidade/idade e sem escolher outra escola).
 *
 * @param mySchoolId — `Student.schoolId` do aluno autenticado; necessário para fallback seguro quando `schoolId` vem explícito na query.
 */
export async function getFilteredSchoolLeaderboard(
  supabase: SupabaseClient,
  filters: LeaderboardFilters,
  limit = 100,
  mySchoolId?: string | null
): Promise<{ rows: LeaderboardRow[]; error: string | null }> {
  const { data, error } = await supabase.rpc("get_leaderboard_filtered", {
    p_school_id: filters.schoolId ?? null,
    p_modality: filters.modality ?? null,
    p_age_bucket: filters.ageBucket ?? null,
    p_limit: limit,
  });

  if (
    error &&
    isMissingGetLeaderboardFilteredRpc(error) &&
    canFallbackToMySchoolOnly(filters, mySchoolId)
  ) {
    return fetchLeaderboardMySchool(supabase, limit);
  }

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
  limit = 100,
  mySchoolId?: string | null
): Promise<{ rows: LeaderboardRow[]; error: string | null }> {
  return getFilteredSchoolLeaderboard(supabase, {}, limit, mySchoolId);
}
