/**
 * Agenda de exames: um dia de exame (início–fim) dividido em horários de `slotMinutes` com
 * `slotCapacity` vagas. Funções puras — a marcação atómica é feita em book_graduation_exam_slot.
 */

/** O aluno pode desmarcar/trocar até este número de horas antes do seu horário. */
export const SELF_CHANGE_CUTOFF_HOURS = 48;
/** As marcações novas fecham este número de horas antes do horário (lista fechada na véspera). */
export const SELF_BOOKING_CUTOFF_HOURS = 24;

const HOUR_MS = 3_600_000;

export type ExamSlotConfig = { scheduledAt: string; endsAt: string | null; slotMinutes: number | null; slotCapacity: number | null };

/** Inícios (ISO UTC) de todos os horários do dia de exame; vazio se não tiver horários. */
export function buildExamSlots(event: ExamSlotConfig): string[] {
  if (!event.endsAt || !event.slotMinutes) return [];
  const start = new Date(event.scheduledAt).getTime();
  const end = new Date(event.endsAt).getTime();
  const step = event.slotMinutes * 60_000;
  const slots: string[] = [];
  for (let t = start; t + step <= end && slots.length < 200; t += step) slots.push(new Date(t).toISOString());
  return slots;
}

/** Chave estável para comparar horários vindos da BD (formatos ISO diferentes). */
export function slotKey(iso: string): number {
  return new Date(iso).getTime();
}

export function canSelfBook(slotIso: string, now: Date = new Date()): boolean {
  return slotKey(slotIso) - now.getTime() >= SELF_BOOKING_CUTOFF_HOURS * HOUR_MS;
}

export function canSelfChange(slotIso: string, now: Date = new Date()): boolean {
  return slotKey(slotIso) - now.getTime() >= SELF_CHANGE_CUTOFF_HOURS * HOUR_MS;
}

/** Data limite para o aluno desmarcar/trocar. */
export function selfChangeDeadline(slotIso: string): Date {
  return new Date(slotKey(slotIso) - SELF_CHANGE_CUTOFF_HOURS * HOUR_MS);
}

/** Ocupação por horário (chave = slotKey). */
export function countBySlot(candidates: { slotStartsAt: string | null }[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const c of candidates) {
    if (!c.slotStartsAt) continue;
    const k = slotKey(c.slotStartsAt);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return map;
}

/** Mensagem para o utilizador a partir do erro levantado pela função SQL. */
export function bookingErrorMessage(message: string | undefined): string {
  if (message?.includes("SLOT_FULL")) return "Esse horário acabou de esgotar. Escolhe outro.";
  if (message?.includes("INVALID_SLOT")) return "Horário inválido.";
  if (message?.includes("EVENT_CLOSED")) return "Este dia de exame já não aceita marcações.";
  if (message?.includes("ALREADY_DECIDED")) return "Este exame já tem resultado.";
  return "Não foi possível marcar o horário.";
}
