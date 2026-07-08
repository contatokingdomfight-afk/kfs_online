import { calendarDateLisbon } from "@/lib/lesson-check-in-window";
import { formatLessonDate } from "@/lib/lesson-utils";

export type TrialListRow = {
  lessonDate: string;
  convertedToStudent: boolean;
  acceptedAt: string | null;
};

export function trialLessonYmd(lessonDate: string): string {
  return String(lessonDate).slice(0, 10);
}

export function isPastTrialLesson(lessonDate: string, today = calendarDateLisbon(new Date())): boolean {
  return trialLessonYmd(lessonDate) < today;
}

/** Ainda relevante na lista principal (ação pendente ou aula por realizar). */
export function isActiveTrial(trial: TrialListRow, today = calendarDateLisbon(new Date())): boolean {
  if (trial.convertedToStudent) return false;
  if (!trial.acceptedAt) return true;
  return !isPastTrialLesson(trial.lessonDate, today);
}

/** Aceite, aula já passou e não foi convertido — histórico. */
export function isCompletedTrial(trial: TrialListRow, today = calendarDateLisbon(new Date())): boolean {
  return !trial.convertedToStudent && Boolean(trial.acceptedAt) && isPastTrialLesson(trial.lessonDate, today);
}

export function formatTrialScheduleLine(
  trial: { lessonDate: string; modality: string },
  lesson: { startTime: string; endTime: string } | null,
  modalityLabels: Record<string, string>
): string {
  const mod = modalityLabels[trial.modality] ?? trial.modality;
  const dateLabel = formatLessonDate(trialLessonYmd(trial.lessonDate));
  if (lesson?.startTime && lesson?.endTime) {
    return `${mod} · ${dateLabel} ${lesson.startTime}–${lesson.endTime}`;
  }
  return `${mod} · ${dateLabel}`;
}
