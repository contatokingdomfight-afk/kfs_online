import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type CoachEventRow = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  event_date: string;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  price: number;
};

/** Eventos activos com data de fim >= hoje (Lisboa / ISO date). */
export async function fetchCoachUpcomingEvents(
  supabase: SupabaseClient,
  limit = 40
): Promise<CoachEventRow[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data: raw } = await supabase
    .from("Event")
    .select(
      "id, name, description, type, event_date, start_date, end_date, start_time, end_time, location, price, is_active"
    )
    .eq("is_active", true)
    .order("start_date", { ascending: true, nullsFirst: false })
    .limit(limit);

  return (raw ?? [])
    .map((row) => {
      const end = ((row as { end_date?: string | null }).end_date ?? row.event_date ?? "").slice(0, 10);
      if (end < today) return null;
      return {
        id: row.id,
        name: row.name,
        description: (row as { description?: string | null }).description ?? null,
        type: (row as { type: string }).type,
        event_date: row.event_date,
        start_date: (row as { start_date?: string | null }).start_date ?? null,
        end_date: (row as { end_date?: string | null }).end_date ?? null,
        start_time: (row as { start_time?: string | null }).start_time ?? null,
        end_time: (row as { end_time?: string | null }).end_time ?? null,
        location: (row as { location?: string | null }).location ?? null,
        price: Number((row as { price?: number }).price ?? 0),
      };
    })
    .filter(Boolean) as CoachEventRow[];
}

/** Eventos com inscrições confirmadas de alunos de uma escola (check-in assistente). */
export async function fetchSchoolCheckInEventIds(
  supabase: SupabaseClient,
  schoolId: string
): Promise<Set<string>> {
  const { data: studs } = await supabase.from("Student").select("id").eq("schoolId", schoolId);
  const sidList = (studs ?? []).map((s) => s.id).filter(Boolean);
  if (sidList.length === 0) return new Set();

  const { data: regs } = await supabase
    .from("EventRegistration")
    .select("eventId")
    .eq("status", "CONFIRMED")
    .in("studentId", sidList);
  return new Set((regs ?? []).map((r) => (r as { eventId: string }).eventId).filter(Boolean));
}
