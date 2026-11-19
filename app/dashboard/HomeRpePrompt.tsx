import { createClient } from "@/lib/supabase/server";
import { calendarDateLisbon, minutesSinceMidnightLisbon } from "@/lib/lesson-check-in-window";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import { addDays, lessonMinutes } from "@/lib/training-load";
import { getLessonFocus } from "@/lib/lesson-focus.server";
import { lessonFocusLabel } from "@/lib/rpe-labels";
import { RpeOneTap } from "./RpeOneTap";
import { bodyMeasuresFromForm } from "@/lib/body-map/measures";
import { normalizePhysicalFormDataJson } from "@/lib/illustrative-body-silhouette";

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
    .or("rpe.is.null,rpeSource.eq.COACH")
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
  const [{ data: rule }, { data: lastPhys }] = await Promise.all([
    supabase.from("XpRule").select("xp").eq("source", "EFFORT_RATING").maybeSingle(),
    // Sexo da figura do «Onde dói?» (ficha física mais recente; sem ficha → figura masculina).
    supabase
      .from("StudentPhysicalAssessment")
      .select("formData")
      .eq("studentId", studentId)
      .eq("status", "SUBMITTED")
      .order("assessedAt", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const sex = bodyMeasuresFromForm(normalizePhysicalFormDataJson((lastPhys as { formData?: unknown } | null)?.formData) ?? {}).sex;
  const xpReward = (rule as { xp?: number } | null)?.xp ?? 5;
  const isToday = String(candidate.a.occurrenceDate).slice(0, 10) === today;
  const when = isToday ? (pt ? "hoje" : "today") : pt ? "ontem" : "yesterday";
  const title = `${MODALITY_LABELS[candidate.l.modality] ?? candidate.l.modality} · ${when} ${(candidate.l.startTime ?? "").slice(0, 5)} · ${minutes} min`;

  const focus = await getLessonFocus(candidate.l.id, String(candidate.a.occurrenceDate).slice(0, 10));
  const focusLabel = focus.length ? lessonFocusLabel(focus, pt) : null;

  return <RpeOneTap attendanceId={candidate.a.id} subtitle={title} focusLabel={focusLabel} minutes={minutes} xpReward={xpReward} locale={locale} sex={sex} />;
}
