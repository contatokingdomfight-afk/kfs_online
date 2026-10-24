"use server";

import { revalidatePath } from "next/cache";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { loadExamEventRow } from "@/lib/graduation/load-exam";
import { loadStudentGraduations } from "@/lib/graduation/load-student-progress";
import { bookingErrorMessage, buildExamSlots, canSelfBook, canSelfChange, slotKey } from "@/lib/graduation/exam-slots";

export type BookingResult = { error?: string; success?: boolean };

function revalidate(eventIds: string[]) {
  revalidatePath("/dashboard/graduacao");
  revalidatePath("/dashboard/graduacao/agendar");
  for (const id of eventIds) revalidatePath(`/coach/graduacao/${id}`);
}

/** Marcações ativas (convocado, dia agendado) do aluno numa modalidade. */
async function activeBookings(supabase: NonNullable<ReturnType<typeof getAdminClientOrNull>["client"]>, studentId: string, modalityCode: string) {
  const { data: rows } = await supabase
    .from("GraduationExamCandidate")
    .select("id, eventId, slotStartsAt, bookedByStudent")
    .eq("studentId", studentId)
    .eq("status", "CONVOKED");
  const eventIds = (rows ?? []).map((r) => r.eventId as string);
  if (eventIds.length === 0) return [];
  const { data: events } = await supabase
    .from("GraduationExamEvent")
    .select("id, scheduledAt")
    .in("id", eventIds)
    .eq("modalityCode", modalityCode)
    .eq("status", "SCHEDULED");
  const startById = new Map((events ?? []).map((e) => [e.id as string, e.scheduledAt as string]));
  return (rows ?? [])
    .filter((r) => startById.has(r.eventId))
    .map((r) => ({
      id: r.id as string,
      eventId: r.eventId as string,
      slotStartsAt: (r.slotStartsAt as string | null) ?? null,
      /** Hora que conta para o limite de 48 h. */
      startsAt: (r.slotStartsAt as string | null) ?? startById.get(r.eventId)!,
      bookedByStudent: Boolean(r.bookedByStudent),
    }));
}

export async function bookExamSlot(eventId: string, slotIso: string): Promise<BookingResult> {
  const studentId = await getCurrentStudentId();
  const supabase = getAdminClientOrNull().client;
  if (!studentId || !supabase) return { error: "Sessão inválida." };

  const event = await loadExamEventRow(supabase, eventId);
  if (!event || event.status !== "SCHEDULED" || !event.selfBooking) return { error: "Este dia de exame não aceita marcações." };
  const slot = buildExamSlots(event).find((s) => slotKey(s) === slotKey(slotIso));
  if (!slot) return { error: "Horário inválido." };
  if (!canSelfBook(slot)) return { error: "As marcações para este horário já fecharam." };

  const graduation = (await loadStudentGraduations(supabase, studentId)).find((g) => g.modalityCode === event.modalityCode);
  const next = graduation?.progress.next;
  if (!graduation || !next) return { error: "Não tens exame disponível nesta modalidade." };

  const existing = await activeBookings(supabase, studentId, event.modalityCode);
  const here = existing.find((b) => b.eventId === eventId);
  const elsewhere = existing.find((b) => b.eventId !== eventId);

  if (here) {
    // Convocado pelo coach sem horário: pode escolher; trocar só até 48 h antes.
    if (here.slotStartsAt && !canSelfChange(here.startsAt)) return { error: "Já não podes trocar de horário (menos de 48 h). Fala com o coach." };
  } else if (elsewhere) {
    if (!elsewhere.bookedByStudent) return { error: "Já estás convocado para outro dia de exame. Fala com o coach para mudar." };
    if (!canSelfChange(elsewhere.startsAt)) return { error: "Já não podes trocar de dia (menos de 48 h). Fala com o coach." };
  } else if (!graduation.progress.isReadyForExam) {
    return { error: "Ainda não cumpres os requisitos para o exame." };
  }

  const { error } = await supabase.rpc("book_graduation_exam_slot", {
    p_event_id: eventId,
    p_student_id: studentId,
    p_grade_id: next.id,
    p_slot_starts_at: slot,
    p_booked_by_student: !here,
    p_ignore_capacity: false,
    p_replace_candidate_id: here ? null : (elsewhere?.id ?? null),
  });
  if (error) {
    console.error("bookExamSlot:", error);
    return { error: bookingErrorMessage(error.message) };
  }
  revalidate([eventId, ...(elsewhere && !here ? [elsewhere.eventId] : [])]);
  return { success: true };
}

export async function cancelExamBooking(candidateId: string): Promise<BookingResult> {
  const studentId = await getCurrentStudentId();
  const supabase = getAdminClientOrNull().client;
  if (!studentId || !supabase) return { error: "Sessão inválida." };

  const { data: c } = await supabase
    .from("GraduationExamCandidate")
    .select("eventId, status, bookedByStudent, slotStartsAt")
    .eq("id", candidateId)
    .eq("studentId", studentId)
    .maybeSingle();
  if (!c || c.status !== "CONVOKED") return { error: "Marcação não encontrada." };
  if (!c.bookedByStudent) return { error: "Foste convocado pelo coach — fala com ele para desmarcar." };
  const event = await loadExamEventRow(supabase, c.eventId);
  if (!event || event.status !== "SCHEDULED") return { error: "Este exame já não pode ser alterado." };
  if (!canSelfChange((c.slotStartsAt as string | null) ?? event.scheduledAt)) return { error: "Já não podes desmarcar (menos de 48 h). Fala com o coach." };

  // Só apaga se ainda ninguém lhe deu notas (o coach pode já ter começado).
  const { count } = await supabase.from("GraduationExamScore").select("candidateId", { count: "exact", head: true }).eq("candidateId", candidateId);
  if ((count ?? 0) > 0) return { error: "O exame já começou. Fala com o coach." };
  const { error } = await supabase.from("GraduationExamCandidate").delete().eq("id", candidateId).eq("status", "CONVOKED");
  if (error) return { error: "Não foi possível desmarcar." };
  revalidate([c.eventId]);
  return { success: true };
}
