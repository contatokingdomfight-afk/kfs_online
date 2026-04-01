import type { SupabaseClient } from "@supabase/supabase-js";

function parseYmd(ymd: string): { y: number; m: number; d: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { y, m, d };
}

function utcDateToYmd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Segunda=1 … Domingo=7 (alinhado a `createLesson`). */
export function weekdayFromYmd(ymd: string): number | null {
  const p = parseYmd(ymd);
  if (!p) return null;
  const d = new Date(Date.UTC(p.y, p.m - 1, p.d));
  const js = d.getUTCDay();
  return js === 0 ? 7 : js;
}

export function lessonDateYmd(date: unknown): string {
  if (typeof date === "string") return date.slice(0, 10);
  if (date instanceof Date) return utcDateToYmd(date);
  return String(date).slice(0, 10);
}

type AnchorRow = {
  id: string;
  date: unknown;
  schoolId: string;
  coachId: string;
  modality: string;
  startTime: string;
  endTime: string;
  isOneOff: boolean;
  isOpenClass: boolean;
};

/**
 * Lista IDs de aulas da mesma série semanal a partir da data da aula âncora (inclusive).
 * Aula única (`isOneOff`): devolve só o próprio ID.
 */
export async function listFutureSeriesLessonIds(
  supabase: SupabaseClient,
  lessonId: string
): Promise<{ ids: string[]; error?: string; isOneOff: boolean }> {
  const id = lessonId.trim();
  const { data: anchor, error: fetchErr } = await supabase
    .from("Lesson")
    .select("id, date, schoolId, coachId, modality, startTime, endTime, isOneOff, isOpenClass")
    .eq("id", id)
    .single();

  if (fetchErr || !anchor) {
    return { ids: [], error: fetchErr?.message ?? "Aula não encontrada.", isOneOff: true };
  }

  const a = anchor as AnchorRow;
  if (a.isOneOff) {
    return { ids: [id], isOneOff: true };
  }

  const anchorYmd = lessonDateYmd(a.date);
  const anchorWd = weekdayFromYmd(anchorYmd);
  if (anchorWd == null) {
    return { ids: [], error: "Data da aula inválida.", isOneOff: false };
  }

  const { data: candidates, error: listErr } = await supabase
    .from("Lesson")
    .select("id, date")
    .eq("schoolId", a.schoolId)
    .eq("coachId", a.coachId)
    .eq("modality", a.modality)
    .eq("startTime", a.startTime)
    .eq("endTime", a.endTime)
    .eq("isOneOff", false)
    .eq("isOpenClass", Boolean(a.isOpenClass))
    .gte("date", anchorYmd);

  if (listErr) {
    return { ids: [], error: listErr.message, isOneOff: false };
  }

  const ids = (candidates ?? [])
    .filter((row) => weekdayFromYmd(lessonDateYmd(row.date)) === anchorWd)
    .map((row) => row.id);

  return { ids, isOneOff: false };
}
