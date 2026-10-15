import type { SupabaseClient } from "@supabase/supabase-js";
import { calendarDateLisbon } from "@/lib/lesson-check-in-window";

/** Segunda-feira (yyyy-MM-dd) da semana de uma data civil. */
export function mondayOfYmd(ymd: string): string {
  const [y, m, d] = ymd.slice(0, 10).split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

/** Segunda-feira da semana atual (dia civil de Lisboa). */
export function currentWeekStart(now: Date = new Date()): string {
  return mondayOfYmd(calendarDateLisbon(now));
}

/**
 * Variação de posição desde o início da semana: positivo = subiu, negativo = desceu, 0 = igual.
 * `null` quando o aluno não estava no registo (novo no ranking).
 */
export function rankDelta(previousRank: number | null | undefined, currentRank: number): number | null {
  if (previousRank == null || !Number.isFinite(previousRank) || currentRank <= 0) return null;
  return previousRank - currentRank;
}

/** Texto curto para o aluno («Subiste 3 lugares esta semana»). */
export function rankDeltaLabel(delta: number | null): string | null {
  if (delta == null) return null;
  if (delta === 0) return "Manténs a posição desta semana";
  const n = Math.abs(delta);
  return `${delta > 0 ? "Subiste" : "Desceste"} ${n} ${n === 1 ? "lugar" : "lugares"} esta semana`;
}

/**
 * Garante o registo da semana atual para cada escola ativa (idempotente: só cria se ainda não existir).
 * Usa a função `get_leaderboard_v2` (sem utilizador autenticado, com `p_school_id`) — o mesmo cálculo do ranking.
 */
export async function ensureWeeklyRankSnapshot(supabase: SupabaseClient): Promise<{ weekStart: string; schools: number; rows: number }> {
  const weekStart = currentWeekStart();
  const { data: schools } = await supabase.from("School").select("id").eq("isActive", true);
  let created = 0;
  let schoolCount = 0;
  for (const s of (schools ?? []) as { id: string }[]) {
    const { data: existing } = await supabase
      .from("RankSnapshot")
      .select("id")
      .eq("weekStart", weekStart)
      .eq("schoolId", s.id)
      .limit(1);
    if ((existing ?? []).length > 0) continue;

    const { data, error } = await supabase.rpc("get_leaderboard_v2", {
      p_school_id: s.id,
      p_modality: null,
      p_age_bucket: null,
      p_limit: 500,
      p_period_start: null,
    });
    if (error) {
      console.error("[rank-snapshot] rpc", s.id, error.message);
      continue;
    }
    const rows = ((Array.isArray(data) ? data : []) as Record<string, unknown>[])
      .filter((r) => Number(r.rank ?? 0) > 0)
      .map((r) => ({
        id: crypto.randomUUID(),
        weekStart,
        schoolId: s.id,
        studentId: String(r.student_id),
        rank: Number(r.rank),
        score: Number(r.score ?? 0),
        xp: Number(r.xp ?? 0),
      }));
    if (rows.length === 0) continue;
    const { error: insErr } = await supabase.from("RankSnapshot").upsert(rows, { onConflict: "weekStart,schoolId,studentId", ignoreDuplicates: true });
    if (insErr) console.error("[rank-snapshot] insert", insErr.message);
    else {
      created += rows.length;
      schoolCount += 1;
    }
  }
  return { weekStart, schools: schoolCount, rows: created };
}

/** Posições no início da semana atual numa escola: studentId → posição. */
export async function loadWeekStartRanks(supabase: SupabaseClient, schoolId: string): Promise<Map<string, number>> {
  const { data } = await supabase
    .from("RankSnapshot")
    .select("studentId, rank")
    .eq("weekStart", currentWeekStart())
    .eq("schoolId", schoolId)
    .limit(1000);
  return new Map(((data ?? []) as { studentId: string; rank: number }[]).map((r) => [r.studentId, Number(r.rank)]));
}
