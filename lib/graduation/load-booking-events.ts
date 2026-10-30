import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { BookingEvent, MyBooking } from "@/app/dashboard/graduacao/agendar/BookingPicker";
import { buildExamSlots, canSelfBook, canSelfChange, countBySlot, selfChangeDeadline, slotKey } from "./exam-slots";

/**
 * Dias de exame abertos para marcação pelo aluno (com vagas por horário) e a marcação do próprio aluno.
 * Usado na página «Agendar exame» e no aviso «Já podes fazer exame» do dashboard.
 */
export async function loadBookingEvents(
  admin: SupabaseClient,
  modalityCode: string,
  studentId: string,
  now: Date = new Date()
): Promise<{ events: BookingEvent[]; myBooking: MyBooking | null }> {
  // Multi-escola: o aluno só vê os dias de exame da sua escola.
  const { data: student } = await admin.from("Student").select("schoolId").eq("id", studentId).maybeSingle();
  if (!student?.schoolId) return { events: [], myBooking: null };

  const { data: eventRows } = await admin
    .from("GraduationExamEvent")
    .select("id, title, scheduledAt, endsAt, slotMinutes, slotCapacity, location, notes")
    .eq("schoolId", student.schoolId)
    .eq("modalityCode", modalityCode)
    .eq("status", "SCHEDULED")
    .eq("selfBooking", true)
    .gt("endsAt", now.toISOString())
    .order("scheduledAt", { ascending: true })
    .limit(12);
  const eventIds = (eventRows ?? []).map((e) => e.id as string);
  const { data: candidateRows } = eventIds.length
    ? await admin.from("GraduationExamCandidate").select("id, eventId, studentId, status, slotStartsAt, bookedByStudent").in("eventId", eventIds)
    : { data: [] as { id: string; eventId: string; studentId: string; status: string; slotStartsAt: string | null; bookedByStudent: boolean }[] };
  const candidates = candidateRows ?? [];
  const mine = candidates.find((c) => c.studentId === studentId && c.status === "CONVOKED") ?? null;

  const events: BookingEvent[] = (eventRows ?? []).map((e) => {
    const counts = countBySlot(candidates.filter((c) => c.eventId === e.id && c.studentId !== studentId));
    const capacity = (e.slotCapacity as number | null) ?? 0;
    return {
      id: e.id as string,
      title: e.title as string,
      scheduledAt: e.scheduledAt as string,
      endsAt: e.endsAt as string,
      slotMinutes: (e.slotMinutes as number | null) ?? 0,
      location: (e.location as string | null) ?? null,
      notes: (e.notes as string | null) ?? null,
      slots: buildExamSlots({
        scheduledAt: e.scheduledAt as string,
        endsAt: e.endsAt as string | null,
        slotMinutes: e.slotMinutes as number | null,
        slotCapacity: capacity,
      }).map((iso) => ({ iso, free: Math.max(0, capacity - (counts.get(slotKey(iso)) ?? 0)), open: canSelfBook(iso, now) })),
    };
  });

  const myBooking: MyBooking | null = mine
    ? (() => {
        const ev = events.find((e) => e.id === mine.eventId)!;
        const startsAt = mine.slotStartsAt ?? ev.scheduledAt;
        return {
          candidateId: mine.id,
          eventId: mine.eventId,
          slotStartsAt: mine.slotStartsAt,
          bookedByStudent: Boolean(mine.bookedByStudent),
          // Sem horário (convocado pelo coach): pode escolher; com horário: só até 48 h antes.
          canChange: !mine.slotStartsAt || canSelfChange(startsAt, now),
          deadline: selfChangeDeadline(startsAt).toISOString(),
        };
      })()
    : null;

  return { events, myBooking };
}
