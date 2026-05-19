import type { EventCheckInParticipantRow } from "@/lib/event-checkin-participants";
import { createAdminClient } from "@/lib/supabase/admin";

/** Inscrições confirmadas do evento só de alunos da escola indicada (check-in assistente / escola). */
export async function fetchEventCheckInParticipantsForSchool(
  eventId: string,
  schoolId: string
): Promise<EventCheckInParticipantRow[]> {
  const supabase = createAdminClient();
  const { data: regs, error } = await supabase
    .from("EventRegistration")
    .select("id, studentId, checkin_used_at")
    .eq("eventId", eventId)
    .eq("status", "CONFIRMED");

  if (error || !regs?.length) return [];

  const studentIds = [...new Set(regs.map((r) => r.studentId))];
  const { data: inSchool } = await supabase
    .from("Student")
    .select("id")
    .in("id", studentIds)
    .eq("schoolId", schoolId);
  const allowed = new Set((inSchool ?? []).map((s) => s.id));
  const filtered = regs.filter((r) => allowed.has(r.studentId));
  if (!filtered.length) return [];

  const filteredStudentIds = [...new Set(filtered.map((r) => r.studentId))];
  const { data: studentsData } = await supabase.from("Student").select("id, userId").in("id", filteredStudentIds);
  if (!studentsData?.length) {
    return filtered.map((r) => ({
      registrationId: r.id,
      displayName: "Participante",
      email: "",
      alreadyUsed: Boolean(r.checkin_used_at),
      checkinUsedAt: (r.checkin_used_at as string | null) ?? null,
    }));
  }

  const userIds = [...new Set(studentsData.map((s) => s.userId))];
  const { data: users } = await supabase.from("User").select("id, name, email").in("id", userIds);
  const userMap = new Map((users ?? []).map((u) => [u.id, u]));
  const studentToUser = new Map(studentsData.map((s) => [s.id, s.userId]));

  const rows: EventCheckInParticipantRow[] = filtered.map((r) => {
    const uid = studentToUser.get(r.studentId);
    const u = uid ? userMap.get(uid) : undefined;
    const email = (u?.email ?? "").trim();
    const name = u?.name?.trim();
    const displayName = name || (email ? email.split("@")[0]! : "Participante");
    return {
      registrationId: r.id,
      displayName,
      email,
      alreadyUsed: Boolean(r.checkin_used_at),
      checkinUsedAt: (r.checkin_used_at as string | null) ?? null,
    };
  });

  rows.sort((a, b) => a.displayName.localeCompare(b.displayName, "pt", { sensitivity: "base" }));
  return rows;
}
