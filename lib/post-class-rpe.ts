/**
 * Lembrete «Como foi o treino?» depois da aula: quem esteve presente numa aula que acabou há
 * pouco e ainda não deu a sua nota de esforço. Função pura (a leitura/escrita vive no cron).
 */

/** Minutos depois do fim da aula a partir dos quais o lembrete sai (dá tempo para o banho/viagem). */
export const PROMPT_AFTER_MIN = 30;
/** Depois disto já não se envia (fica só o cartão na Home). */
export const PROMPT_UNTIL_MIN = 180;

export type PromptAttendance = {
  id: string;
  studentId: string;
  lessonId: string;
  rpe: number | null;
  rpeSource: string | null;
};

export type PromptLesson = { id: string; modality: string; startTime: string | null; endTime: string | null };

export function hhmmToMinutes(s: string | null | undefined): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(s ?? "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** href da notificação: identifica a presença (serve também para não enviar duas vezes). */
export function rpePromptHref(attendanceId: string): string {
  return `/dashboard?rpe=${encodeURIComponent(attendanceId)}`;
}

/**
 * Presenças (de hoje) que devem receber o lembrete agora: aula terminada há entre
 * PROMPT_AFTER_MIN e PROMPT_UNTIL_MIN minutos, sem nota do próprio aluno e ainda sem lembrete.
 * No máximo um lembrete por aluno (a aula mais recente).
 */
export function selectPostClassPrompts(
  attendances: PromptAttendance[],
  lessonsById: Map<string, PromptLesson>,
  alreadyPromptedAttendanceIds: Set<string>,
  nowMinutesLisbon: number
): { attendance: PromptAttendance; lesson: PromptLesson; endMin: number }[] {
  const byStudent = new Map<string, { attendance: PromptAttendance; lesson: PromptLesson; endMin: number }>();
  for (const a of attendances) {
    if (a.rpe != null && a.rpeSource !== "COACH") continue;
    if (alreadyPromptedAttendanceIds.has(a.id)) continue;
    const lesson = lessonsById.get(a.lessonId);
    const endMin = hhmmToMinutes(lesson?.endTime);
    if (!lesson || endMin == null) continue;
    const since = nowMinutesLisbon - endMin;
    if (since < PROMPT_AFTER_MIN || since > PROMPT_UNTIL_MIN) continue;
    const prev = byStudent.get(a.studentId);
    if (!prev || endMin > prev.endMin) byStudent.set(a.studentId, { attendance: a, lesson, endMin });
  }
  return [...byStudent.values()];
}
