import { createClient } from "@/lib/supabase/server";
import { calendarDateLisbon, minutesSinceMidnightLisbon } from "@/lib/lesson-check-in-window";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import { addDays, lessonMinutes } from "@/lib/training-load";
import { RpeOneTap } from "./RpeOneTap";

const toMin = (s: string | null | undefined) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(s ?? "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

/**
 * «Como foi o treino?» na Home: a aula confirmada mais recente (hoje já terminada, ou ontem)
 * ainda sem nota de esforço. Um toque grava o RPE — é o que alimenta a carga de treino.
 */
export async function HomeRpePrompt({ studentId, locale }: { studentId: string; locale: "pt" | "en" }) {
  const pt = locale !== "en";
  const supabase = await createClient();
  const now = new Date();
  const today = calendarDateLisbon(now);
  const nowMin = minutesSinceMidnightLisbon(now);

  const { data: rows } = await supabase
    .from("Attendance")
    .select("id, lessonId, occurrenceDate")
    .eq("studentId", studentId)
    .eq("status", "CONFIRMED")
    .is("rpe", null)
    .gte("occurrenceDate", addDays(today, -1))
    .lte("occurrenceDate", today)
    .order("occurrenceDate", { ascending: false });
  const att = (rows ?? []) as { id: string; lessonId: string; occurrenceDate: string }[];
  if (att.length === 0) return null;

  const { data: lessons } = await supabase
    .from("Lesson")
    .select("id, modality, startTime, endTime")
    .in("id", [...new Set(att.map((a) => a.lessonId))]);
  const byId = new Map(((lessons ?? []) as { id: string; modality: string; startTime: string | null; endTime: string | null }[]).map((l) => [l.id, l]));

  const candidate = att
    .map((a) => ({ a, l: byId.get(a.lessonId) }))
    .filter(({ a, l }) => {
      if (!l) return false;
      if (String(a.occurrenceDate).slice(0, 10) < today) return true;
      const end = toMin(l.endTime);
      return end != null && end <= nowMin;
    })
    .sort((x, y) => String(y.a.occurrenceDate).localeCompare(String(x.a.occurrenceDate)) || (toMin(y.l?.startTime) ?? 0) - (toMin(x.l?.startTime) ?? 0))[0];
  if (!candidate || !candidate.l) return null;

  const minutes = lessonMinutes(candidate.l.startTime, candidate.l.endTime);
  const isToday = String(candidate.a.occurrenceDate).slice(0, 10) === today;
  const when = isToday ? (pt ? "hoje" : "today") : pt ? "ontem" : "yesterday";
  const title = `${MODALITY_LABELS[candidate.l.modality] ?? candidate.l.modality} · ${when} ${(candidate.l.startTime ?? "").slice(0, 5)} · ${minutes} min`;

  return <RpeOneTap attendanceId={candidate.a.id} subtitle={title} minutes={minutes} locale={locale} />;
}
