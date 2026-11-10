import { calendarDateLisbon } from "@/lib/lesson-check-in-window";
import { ymdAddDays } from "@/lib/lesson-occurrences";

/** Quantos dias para trás o coach pode marcar presenças esquecidas (ex.: aula de ontem). */
export const COACH_LATE_CHECK_IN_DAYS = 2;

/** Erro se a aula for anterior à janela de presenças tardias do coach (hoje − 2 dias, Lisboa). */
export function coachLateCheckInDateError(occurrenceYmd: string, now: Date = new Date()): string | null {
  const minYmd = ymdAddDays(calendarDateLisbon(now), -COACH_LATE_CHECK_IN_DAYS);
  if (occurrenceYmd < minYmd) {
    return `Só é possível marcar presenças até ${COACH_LATE_CHECK_IN_DAYS} dias depois da aula. Fala com a secretaria.`;
  }
  return null;
}
