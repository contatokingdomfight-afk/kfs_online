import type { SupabaseClient } from "@supabase/supabase-js";
import { calendarDateLisbon } from "@/lib/lesson-check-in-window";

export type TodayTrialClass = {
  id: string;
  name: string;
  contact: string;
  modality: string;
  lessonDate: string;
  lessonId: string | null;
  acceptedAt: string | null;
  startTime: string | null;
  endTime: string | null;
};

type TrialRow = {
  id: string;
  name: string;
  contact: string;
  modality: string;
  lessonDate: string;
  lessonId: string | null;
  acceptedAt: string | null;
};

function ymdFromLessonDate(lessonDate: string): string {
  return String(lessonDate).slice(0, 10);
}

function sortTrials(a: TodayTrialClass, b: TodayTrialClass): number {
  const ta = a.startTime ?? "99:99";
  const tb = b.startTime ?? "99:99";
  if (ta !== tb) return ta.localeCompare(tb);
  return a.name.localeCompare(b.name, "pt");
}

async function enrichWithLessonTimes(
  supabase: SupabaseClient,
  rows: TrialRow[]
): Promise<TodayTrialClass[]> {
  const lessonIds = [...new Set(rows.map((r) => r.lessonId).filter(Boolean))] as string[];
  const lessonById = new Map<string, { startTime: string; endTime: string }>();

  if (lessonIds.length > 0) {
    const { data: lessons } = await supabase
      .from("Lesson")
      .select("id, startTime, endTime")
      .in("id", lessonIds);
    for (const l of lessons ?? []) {
      lessonById.set(l.id, { startTime: l.startTime, endTime: l.endTime });
    }
  }

  return rows.map((t) => {
    const lesson = t.lessonId ? lessonById.get(t.lessonId) : null;
    return {
      id: t.id,
      name: t.name,
      contact: t.contact,
      modality: t.modality,
      lessonDate: ymdFromLessonDate(t.lessonDate),
      lessonId: t.lessonId,
      acceptedAt: t.acceptedAt,
      startTime: lesson?.startTime ?? null,
      endTime: lesson?.endTime ?? null,
    };
  });
}

/** Experimentais agendados para hoje (Lisboa), não convertidos. */
export async function getTodayTrialClassesForCoach(
  supabase: SupabaseClient,
  coachLessonIds: Set<string>
): Promise<TodayTrialClass[]> {
  const today = calendarDateLisbon(new Date());

  const { data: trialsRaw } = await supabase
    .from("TrialClass")
    .select("id, name, contact, modality, lessonDate, lessonId, acceptedAt")
    .eq("convertedToStudent", false)
    .eq("lessonDate", today)
    .order("createdAt", { ascending: true });

  const filtered = (trialsRaw ?? []).filter((t) => {
    if (!t.lessonId) return true;
    return coachLessonIds.has(t.lessonId);
  }) as TrialRow[];

  return (await enrichWithLessonTimes(supabase, filtered)).sort(sortTrials);
}

/** Experimentais agendados para hoje (Lisboa), não convertidos — âmbito admin. */
export async function getTodayTrialClassesForAdmin(
  supabase: SupabaseClient,
  schoolId: string | null
): Promise<TodayTrialClass[]> {
  const today = calendarDateLisbon(new Date());

  const { data: trialsRaw } = await supabase
    .from("TrialClass")
    .select("id, name, contact, modality, lessonDate, lessonId, acceptedAt")
    .eq("convertedToStudent", false)
    .eq("lessonDate", today)
    .order("createdAt", { ascending: true });

  let filtered = (trialsRaw ?? []) as TrialRow[];

  if (schoolId) {
    const lessonIds = [...new Set(filtered.map((t) => t.lessonId).filter(Boolean))] as string[];
    if (lessonIds.length > 0) {
      const { data: lessons } = await supabase
        .from("Lesson")
        .select("id")
        .eq("schoolId", schoolId)
        .in("id", lessonIds);
      const validLessonIds = new Set((lessons ?? []).map((l) => l.id));
      filtered = filtered.filter((t) => !t.lessonId || validLessonIds.has(t.lessonId));
    } else {
      filtered = [];
    }
  }

  return (await enrichWithLessonTimes(supabase, filtered)).sort(sortTrials);
}
