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
function isMissingLeaderboardRpc(
  error: { message?: string },
  functionName: "get_leaderboard_filtered" | "get_leaderboard_my_school"
): boolean {
  const m = (error.message ?? "").toLowerCase();
  const fn = functionName.toLowerCase();
  return (
    m.includes(fn) &&
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
): Promise<{
  rows: LeaderboardRow[];
  error: string | null;
  errorKind?: "ranking_rpc_not_deployed";
}> {
  const { data, error } = await supabase.rpc("get_leaderboard_my_school", {
    p_limit: limit,
  });
  if (error) {
    if (isMissingLeaderboardRpc(error, "get_leaderboard_my_school")) {
      return {
        rows: [],
        error: null,
        errorKind: "ranking_rpc_not_deployed",
      };
    }
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
  if (filters.modality || filters.ageBucket || filters.periodStart) return false;
  const sid = filters.schoolId;
  if (sid == null || sid === "") return true;
  if (!mySchoolId) return false;
  return sid === mySchoolId;
}

export type LeaderboardErrorKind = "ranking_rpc_not_deployed";

export type LeaderboardResult = {
  rows: LeaderboardRow[];
  error: string | null;
  /** Quando as RPCs de ranking não existem no projeto Supabase (migrações por aplicar). */
  errorKind?: LeaderboardErrorKind;
};

export type LeaderboardFilters = {
  /** Escola a listar; omitir ou null = escola do aluno autenticado. */
  schoolId?: string | null;
  /** Código de modalidade (`Student.primaryModality`); omitir = todas. */
  modality?: string | null;
  /** KIDS | TEENS | ADULTS | MASTERS; omitir = todas as idades. */
  ageBucket?: string | null;
  /** Data ISO (YYYY-MM-DD); quando definida, ranking = XP ganho desde esta data (snapshots diários). Omitir = XP total/lifetime. */
  periodStart?: string | null;
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
): Promise<LeaderboardResult> {
  const { data, error } = await supabase.rpc("get_leaderboard_filtered", {
    p_school_id: filters.schoolId ?? null,
    p_modality: filters.modality ?? null,
    p_age_bucket: filters.ageBucket ?? null,
    p_limit: limit,
    p_period_start: filters.periodStart ?? null,
  });

  if (
    error &&
    isMissingLeaderboardRpc(error, "get_leaderboard_filtered") &&
    canFallbackToMySchoolOnly(filters, mySchoolId)
  ) {
    return fetchLeaderboardMySchool(supabase, limit);
  }

  if (error) {
    if (isMissingLeaderboardRpc(error, "get_leaderboard_filtered")) {
      return {
        rows: [],
        error: null,
        errorKind: "ranking_rpc_not_deployed",
      };
    }
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
): Promise<LeaderboardResult> {
  return getFilteredSchoolLeaderboard(supabase, {}, limit, mySchoolId);
}

export type LeaderboardV2Row = {
  rank: number;
  student_id: string;
  display_name: string;
  /** Sem modalidade: Pontuação Kingdom (0–1000). Com modalidade: XP da modalidade. */
  score: number;
  xp: number;
  /** XP antigo (Athlete.xp) — ainda usado para a faixa por XP até à migração para graus. */
  legacy_xp: number;
  athlete_id: string | null;
  is_current_user: boolean;
  modalities: string[];
};

/**
 * Ranking v2 (RPC `get_leaderboard_v2`): XP calculado por modalidade a partir das fontes
 * (presenças, avaliações, cursos, exames). Sem modalidade devolve a Pontuação Kingdom,
 * normalizada por percentis para quem treina várias modalidades não ficar à frente só por volume.
 * O aluno autenticado vem sempre incluído, mesmo fora do limite.
 */
export async function getLeaderboardV2(
  supabase: SupabaseClient,
  filters: LeaderboardFilters,
  limit = 100
): Promise<{ rows: LeaderboardV2Row[]; error: string | null }> {
  const { data, error } = await supabase.rpc("get_leaderboard_v2", {
    p_school_id: filters.schoolId ?? null,
    p_modality: filters.modality ?? null,
    p_age_bucket: filters.ageBucket ?? null,
    p_limit: limit,
    p_period_start: filters.periodStart ?? null,
  });
  if (error) return { rows: [], error: error.message };
  const rows = (Array.isArray(data) ? data : []).map((r: Record<string, unknown>) => ({
    rank: Number(r.rank ?? 0),
    student_id: String(r.student_id ?? ""),
    display_name: String(r.display_name ?? ""),
    score: Number(r.score ?? 0),
    xp: Number(r.xp ?? 0),
    legacy_xp: Number(r.legacy_xp ?? 0),
    athlete_id: r.athlete_id ? String(r.athlete_id) : null,
    is_current_user: Boolean(r.is_current_user),
    modalities: Array.isArray(r.modalities) ? (r.modalities as string[]) : [],
  }));
  return { rows, error: null };
}
