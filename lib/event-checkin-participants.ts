import { createAdminClient } from "@/lib/supabase/admin";

export type EventCheckInParticipantRow = {
  registrationId: string;
  displayName: string;
  email: string;
  alreadyUsed: boolean;
};

/** Inscrições confirmadas do evento, para check-in manual (nome / e-mail). */
export async function fetchEventCheckInParticipants(eventId: string): Promise<EventCheckInParticipantRow[]> {
  const supabase = createAdminClient();
  const { data: regs, error } = await supabase
    .from("EventRegistration")
    .select("id, studentId, checkin_used_at")
    .eq("eventId", eventId)
    .eq("status", "CONFIRMED");

  if (error || !regs?.length) return [];

  const studentIds = [...new Set(regs.map((r) => r.studentId))];
  const { data: studentsData } = await supabase.from("Student").select("id, userId").in("id", studentIds);
  if (!studentsData?.length) {
    return regs.map((r) => ({
      registrationId: r.id,
      displayName: "Participante",
      email: "",
      alreadyUsed: Boolean(r.checkin_used_at),
    }));
  }

  const userIds = [...new Set(studentsData.map((s) => s.userId))];
  const { data: users } = await supabase.from("User").select("id, name, email").in("id", userIds);
  const userMap = new Map((users ?? []).map((u) => [u.id, u]));
  const studentToUser = new Map(studentsData.map((s) => [s.id, s.userId]));

  const rows: EventCheckInParticipantRow[] = regs.map((r) => {
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
    };
  });

  rows.sort((a, b) => a.displayName.localeCompare(b.displayName, "pt", { sensitivity: "base" }));
  return rows;
}
