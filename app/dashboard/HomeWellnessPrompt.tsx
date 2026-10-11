import { createClient } from "@/lib/supabase/server";
import { calendarDateLisbon, minutesSinceMidnightLisbon } from "@/lib/lesson-check-in-window";
import { MODALITY_LABELS } from "@/lib/lesson-utils";
import { WellnessTodayForm } from "./WellnessTodayForm";

const toMin = (s: string | null | undefined) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(s ?? "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

/**
 * «Como estás hoje?» na Home: aula de hoje em que o aluno marcou «Vou» (ou já fez check-in), que ainda
 * não acabou, sem bem-estar registado. Respondido aqui, o check-in já não pergunta nada.
 */
export async function HomeWellnessPrompt({ studentId, locale }: { studentId: string; locale: "pt" | "en" }) {
  const pt = locale !== "en";
  const supabase = await createClient();
  const now = new Date();
  const today = calendarDateLisbon(now);
  const nowMin = minutesSinceMidnightLisbon(now);

  const [{ data: att }, { data: done }] = await Promise.all([
    supabase.from("Attendance").select("lessonId, status").eq("studentId", studentId).eq("occurrenceDate", today).in("status", ["PENDING", "CONFIRMED"]),
    supabase.from("PreLessonWellness").select("lessonId").eq("studentId", studentId).eq("occurrenceDate", today),
  ]);
  const answered = new Set(((done ?? []) as { lessonId: string }[]).map((w) => w.lessonId));
  const lessonIds = ((att ?? []) as { lessonId: string }[]).map((a) => a.lessonId).filter((id) => !answered.has(id));
  if (lessonIds.length === 0) return null;

  const { data: lessons } = await supabase.from("Lesson").select("id, modality, startTime, endTime").in("id", lessonIds);
  const next = ((lessons ?? []) as { id: string; modality: string; startTime: string | null; endTime: string | null }[])
    .filter((l) => {
      const end = toMin(l.endTime);
      return end == null || end > nowMin;
    })
    .sort((a, b) => (toMin(a.startTime) ?? 0) - (toMin(b.startTime) ?? 0))[0];
  if (!next) return null;

  const subtitle = `${MODALITY_LABELS[next.modality] ?? next.modality} ${pt ? "hoje às" : "today at"} ${(next.startTime ?? "").slice(0, 5)} · ${pt ? "o teu coach vê isto antes da aula" : "your coach sees this before class"}`;
  return <WellnessTodayForm lessonId={next.id} occurrenceDate={today} subtitle={subtitle} locale={locale} />;
}
