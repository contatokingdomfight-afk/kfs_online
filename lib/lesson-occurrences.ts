import type { SupabaseClient } from "@supabase/supabase-js";

/** Linha na tabela `Lesson` (definição). */
export type LessonDefinitionRow = {
  id: string;
  modality: string | null;
  date: string | null;
  weekday: number | null;
  startTime: string;
  endTime: string;
  coachId: string;
  /** Professores (N:N); se vazio na origem, usar só `coachId`. */
  coachIds?: string[];
  schoolId: string;
  locationId: string | null;
  capacity: number | null;
  planningNotes: string | null;
  isOneOff: boolean;
  isOpenClass: boolean;
  /** true = restrita a alunos marcados como "atleta de competição" (Student.competitionAthlete). */
  athletesOnly?: boolean;
  /** false = não expandir para /aula-experimental (definição ainda existe na agenda interna). */
  offerTrialBooking?: boolean;
  createdAt?: string;
};

/** Mapeia linhas `Lesson` do Supabase para definições usadas na expansão. */
export function rowsToLessonDefinitions(rows: unknown[] | null | undefined): LessonDefinitionRow[] {
  return (rows ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: String(r.id),
      modality: (r.modality as string | null) ?? null,
      date: typeof r.date === "string" ? r.date.slice(0, 10) : (r.date as string | null),
      weekday: typeof r.weekday === "number" ? r.weekday : r.weekday != null ? Number(r.weekday) : null,
      startTime: String(r.startTime ?? ""),
      endTime: String(r.endTime ?? ""),
      coachId: String(r.coachId ?? ""),
      schoolId: String(r.schoolId ?? ""),
      locationId: (r.locationId as string | null) ?? null,
      capacity: (r.capacity as number | null) ?? null,
      planningNotes: (r.planningNotes as string | null) ?? null,
      isOneOff: Boolean(r.isOneOff),
      isOpenClass: Boolean(r.isOpenClass),
      athletesOnly: Boolean(r.athletesOnly),
      offerTrialBooking: r.offerTrialBooking === false ? false : true,
    };
  });
}

/** Uma ocorrência na agenda (virtual para recorrentes). */
export type ExpandedLessonRow = LessonDefinitionRow & {
  /** Data concreta YYYY-MM-DD (presenças / cancelamento). */
  occurrenceDate: string;
  occurrenceKey: string;
};

/** Segunda=1 … Domingo=7 (UTC), alinhado à expansão de ocorrências. */
export function weekdayFromYmd(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const js = dt.getUTCDay();
  return js === 0 ? 7 : js;
}

/** Adiciona dias a uma data `YYYY-MM-DD` (UTC). */
export function ymdAddDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

function eachDateInRange(start: string, end: string): string[] {
  const out: string[] = [];
  let cur = start;
  let guard = 0;
  while (cur <= end && guard < 400) {
    out.push(cur);
    cur = ymdAddDays(cur, 1);
    guard++;
  }
  return out;
}

export async function fetchLessonCancellations(
  supabase: SupabaseClient,
  lessonIds: string[]
): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>();
  if (lessonIds.length === 0) return map;
  const { data } = await supabase.from("LessonCancellation").select("lessonId, date").in("lessonId", lessonIds);
  for (const row of data ?? []) {
    const lid = (row as { lessonId: string }).lessonId;
    const raw = (row as { date: unknown }).date;
    const ds = typeof raw === "string" ? raw.slice(0, 10) : String(raw).slice(0, 10);
    if (!map.has(lid)) map.set(lid, new Set());
    map.get(lid)!.add(ds);
  }
  return map;
}

/**
 * Expande definições para o intervalo [rangeStart, rangeEnd] (inclusive), YYYY-MM-DD.
 */
export function expandLessonsForDateRange(
  lessons: LessonDefinitionRow[],
  cancellations: Map<string, Set<string>>,
  rangeStart: string,
  rangeEnd: string
): ExpandedLessonRow[] {
  const dates = eachDateInRange(rangeStart, rangeEnd);
  const out: ExpandedLessonRow[] = [];

  for (const L of lessons) {
    if (L.isOneOff) {
      const d = typeof L.date === "string" ? L.date.slice(0, 10) : "";
      if (!d || d < rangeStart || d > rangeEnd) continue;
      out.push({
        ...L,
        occurrenceDate: d,
        occurrenceKey: `${L.id}_${d}`,
      });
      continue;
    }

    const wd = L.weekday;
    if (wd == null) continue;

    for (const d of dates) {
      if (weekdayFromYmd(d) !== wd) continue;
      if (cancellations.get(L.id)?.has(d)) continue;
      out.push({
        ...L,
        occurrenceDate: d,
        occurrenceKey: `${L.id}_${d}`,
      });
    }
  }

  out.sort((a, b) =>
    a.occurrenceDate === b.occurrenceDate
      ? a.startTime < b.startTime
        ? -1
        : 1
      : a.occurrenceDate < b.occurrenceDate
        ? -1
        : 1
  );
  return out;
}
