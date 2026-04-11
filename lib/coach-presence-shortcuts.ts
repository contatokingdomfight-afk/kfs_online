import { toDate } from "date-fns-tz";
import { LISBON_TZ } from "@/lib/lisbon-payment-dates";
import type { ExpandedLessonRow } from "@/lib/lesson-occurrences";

function timeToHhMm(t: string): string {
  const s = t.trim();
  return s.length >= 5 ? s.slice(0, 5) : s;
}

function lessonStart(l: ExpandedLessonRow): Date {
  return toDate(`${l.occurrenceDate}T${timeToHhMm(l.startTime)}:00`, { timeZone: LISBON_TZ });
}

function lessonEnd(l: ExpandedLessonRow): Date {
  return toDate(`${l.occurrenceDate}T${timeToHhMm(l.endTime)}:00`, { timeZone: LISBON_TZ });
}

export type OccurrencePick = { lessonId: string; occurrenceDate: string };

/**
 * Última ocorrência já terminada e próxima ocorrência que ainda não começou (Europe/Lisbon).
 */
export function pickLastAndNextOccurrence(
  occurrences: ExpandedLessonRow[],
  now: Date = new Date()
): { last: OccurrencePick | null; next: OccurrencePick | null } {
  if (!occurrences.length) return { last: null, next: null };

  const pastEnded = occurrences.filter((l) => lessonEnd(l) < now);
  let last: OccurrencePick | null = null;
  if (pastEnded.length) {
    const best = pastEnded.reduce((a, b) => (lessonEnd(a) > lessonEnd(b) ? a : b));
    last = { lessonId: best.id, occurrenceDate: best.occurrenceDate };
  }

  const futureStarts = occurrences.filter((l) => lessonStart(l) > now);
  let next: OccurrencePick | null = null;
  if (futureStarts.length) {
    const best = futureStarts.reduce((a, b) => (lessonStart(a) < lessonStart(b) ? a : b));
    next = { lessonId: best.id, occurrenceDate: best.occurrenceDate };
  }

  return { last, next };
}

export function coachPresenceUrl(lessonId: string, occurrenceDate: string): string {
  return `/coach/aula?lesson=${lessonId}&date=${encodeURIComponent(occurrenceDate)}`;
}
