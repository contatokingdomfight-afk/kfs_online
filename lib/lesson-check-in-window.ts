/**
 * Janela de check-in: desde o início da aula até 3 horas após o fim (calendário Europe/Lisbon).
 */

import { addHours } from "date-fns";
import { formatInTimeZone, toDate } from "date-fns-tz";
import { LISBON_TZ } from "@/lib/lisbon-payment-dates";

export type LessonTimeFields = {
  date: string;
  startTime: string;
  endTime: string;
};

function padTimePart(t: string | null | undefined): string {
  if (t == null || String(t).trim() === "") return "00:00:00";
  const parts = String(t).trim().split(":");
  const h = (parts[0] ?? "0").padStart(2, "0");
  const m = (parts[1] ?? "00").padStart(2, "0");
  const s = (parts[2] ?? "00").padStart(2, "0");
  return `${h}:${m}:${s}`;
}

/** Aula com data e horários preenchidos na BD (evita crash em `.trim()` / janela inválida). */
export function lessonHasValidSchedule(lesson: {
  date: string | null | undefined;
  startTime: string | null | undefined;
  endTime: string | null | undefined;
}): boolean {
  if (lesson.date == null || lesson.startTime == null || lesson.endTime == null) return false;
  const d = String(lesson.date).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  return String(lesson.startTime).trim() !== "" && String(lesson.endTime).trim() !== "";
}

/** Início da aula em instante (Europe/Lisbon). */
export function lessonStartInstant(lesson: LessonTimeFields): Date {
  return toDate(`${lesson.date}T${padTimePart(lesson.startTime)}`, { timeZone: LISBON_TZ });
}

/** Fim da aula em instante (Europe/Lisbon). */
export function lessonEndInstant(lesson: LessonTimeFields): Date {
  return toDate(`${lesson.date}T${padTimePart(lesson.endTime)}`, { timeZone: LISBON_TZ });
}

/** Fim da janela de check-in: fim da aula + 3 horas. */
export function lessonCheckInWindowEnd(lesson: LessonTimeFields): Date {
  return addHours(lessonEndInstant(lesson), 3);
}

/** `now` está dentro da janela em que o check-in é permitido (início → fim+3h). */
export function isWithinLessonCheckInWindow(lesson: LessonTimeFields, now: Date = new Date()): boolean {
  const start = lessonStartInstant(lesson);
  const end = lessonCheckInWindowEnd(lesson);
  const t = now.getTime();
  return t >= start.getTime() && t <= end.getTime();
}

/** Data de calendário (yyyy-MM-dd) em Lisboa para `now`. */
export function calendarDateLisbon(now: Date): string {
  return formatInTimeZone(now, LISBON_TZ, "yyyy-MM-dd");
}

/**
 * Aula ainda deve aparecer no cartão «Próxima aula»: futura na semana, ou hoje antes de fechar a janela (fim+3h).
 */
export function isLessonEligibleForNextCard(lesson: LessonTimeFields, now: Date = new Date()): boolean {
  const day = lesson.date;
  const today = calendarDateLisbon(now);
  if (day > today) return true;
  if (day < today) return false;
  return now.getTime() <= lessonCheckInWindowEnd(lesson).getTime();
}

/** Primeira aula na lista ordenada que ainda é válida para o cartão. */
export function pickNextLessonForCard<T extends LessonTimeFields>(lessons: T[], now: Date = new Date()): T | null {
  for (const l of lessons) {
    if (isLessonEligibleForNextCard(l, now)) return l;
  }
  return null;
}
