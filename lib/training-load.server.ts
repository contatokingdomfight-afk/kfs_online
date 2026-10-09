import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, lessonMinutes, type TrainingSession } from "@/lib/training-load";

/** Dias de presenças lidos: 8 semanas do gráfico (cobre também a base de 4 semanas do rácio). */
const LOOKBACK_DAYS = 56;
const PAGE = 1000;

function chunks<T>(xs: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
}

/** Treinos (presenças confirmadas) por aluno, com RPE e minutos da aula. */
export async function loadTrainingSessions(
  supabase: SupabaseClient,
  studentIds: string[],
  today: string
): Promise<Map<string, TrainingSession[]>> {
  const out = new Map<string, TrainingSession[]>();
  const ids = [...new Set(studentIds)];
  if (ids.length === 0) return out;
  const from = addDays(today, -LOOKBACK_DAYS);

  type Row = { studentId: string; lessonId: string; occurrenceDate: string | null; rpe: number | null };
  const rows: Row[] = [];
  for (const part of chunks(ids, 100)) {
    for (let offset = 0; ; offset += PAGE) {
      const { data } = await supabase
        .from("Attendance")
        .select("studentId, lessonId, occurrenceDate, rpe")
        .in("studentId", part)
        .eq("status", "CONFIRMED")
        .gte("occurrenceDate", from)
        .lte("occurrenceDate", today)
        .order("occurrenceDate", { ascending: true })
        .range(offset, offset + PAGE - 1);
      const batch = (data ?? []) as Row[];
      rows.push(...batch);
      if (batch.length < PAGE) break;
    }
  }

  const lessonIds = [...new Set(rows.map((r) => r.lessonId))];
  const minutesByLesson = new Map<string, number>();
  for (const part of chunks(lessonIds, 200)) {
    const { data } = await supabase.from("Lesson").select("id, startTime, endTime").in("id", part);
    for (const l of (data ?? []) as { id: string; startTime: string | null; endTime: string | null }[]) {
      minutesByLesson.set(l.id, lessonMinutes(l.startTime, l.endTime));
    }
  }

  for (const r of rows) {
    if (!r.occurrenceDate) continue;
    const list = out.get(r.studentId) ?? [];
    list.push({ date: String(r.occurrenceDate).slice(0, 10), rpe: r.rpe ?? null, minutes: minutesByLesson.get(r.lessonId) ?? 60 });
    out.set(r.studentId, list);
  }
  return out;
}

export type WellnessSnapshot = {
  /** Média de horas de sono nos registos pré-aula dos últimos 7 dias. */
  avgSleep7d: number | null;
  /** Prontidão do registo pré-aula mais recente (últimos 7 dias). */
  lastZone: "GREEN" | "YELLOW" | "RED" | null;
  /** Dores reportadas nos últimos 14 dias (maior intensidade por zona). */
  pains: { region: string; intensity: number }[];
};

/** Sono, prontidão e dores recentes por aluno (o que o aluno regista no check-in e em Bem-estar). */
export async function loadWellnessSnapshots(
  supabase: SupabaseClient,
  studentIds: string[],
  today: string
): Promise<Map<string, WellnessSnapshot>> {
  const out = new Map<string, WellnessSnapshot>();
  const ids = [...new Set(studentIds)];
  for (const id of ids) out.set(id, { avgSleep7d: null, lastZone: null, pains: [] });
  if (ids.length === 0) return out;

  for (const part of chunks(ids, 100)) {
    const [{ data: wellness }, { data: pains }] = await Promise.all([
      supabase
        .from("PreLessonWellness")
        .select("studentId, occurrenceDate, sleepHours, wellnessZone")
        .in("studentId", part)
        .gte("occurrenceDate", addDays(today, -6))
        .order("occurrenceDate", { ascending: true }),
      supabase
        .from("PainSelfReport")
        .select("studentId, bodyRegion, intensity, reportedAt")
        .in("studentId", part)
        .gte("reportedAt", addDays(today, -13)),
    ]);
    const sleepSum = new Map<string, { sum: number; n: number }>();
    for (const w of (wellness ?? []) as { studentId: string; sleepHours: number | string; wellnessZone: string }[]) {
      const snap = out.get(w.studentId);
      if (!snap) continue;
      const hours = Number(w.sleepHours);
      if (Number.isFinite(hours)) {
        const acc = sleepSum.get(w.studentId) ?? { sum: 0, n: 0 };
        sleepSum.set(w.studentId, { sum: acc.sum + hours, n: acc.n + 1 });
      }
      snap.lastZone = w.wellnessZone as WellnessSnapshot["lastZone"];
    }
    for (const [id, { sum, n }] of sleepSum) {
      const snap = out.get(id);
      if (snap && n > 0) snap.avgSleep7d = Math.round((sum / n) * 10) / 10;
    }
    for (const p of (pains ?? []) as { studentId: string; bodyRegion: string; intensity: number }[]) {
      const snap = out.get(p.studentId);
      if (!snap) continue;
      const existing = snap.pains.find((x) => x.region === p.bodyRegion);
      if (existing) existing.intensity = Math.max(existing.intensity, p.intensity);
      else snap.pains.push({ region: p.bodyRegion, intensity: p.intensity });
    }
  }
  for (const snap of out.values()) snap.pains.sort((a, b) => b.intensity - a.intensity);
  return out;
}
