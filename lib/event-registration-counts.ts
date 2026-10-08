import "server-only";

import { getAdminClientOrNull } from "@/lib/supabase/admin";

/**
 * Nº de inscrições activas (PENDING ou CONFIRMED) por evento. Usa o cliente admin porque o RLS
 * só deixa o aluno ver as próprias inscrições; devolve apenas contagens, nunca quem são.
 */
export async function countActiveEventRegistrations(eventIds: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  if (eventIds.length === 0) return out;
  const { client } = getAdminClientOrNull();
  if (!client) return out;
  const { data, error } = await client
    .from("EventRegistration")
    .select("eventId")
    .in("eventId", eventIds)
    .in("status", ["PENDING", "CONFIRMED"]);
  if (error) {
    console.error("countActiveEventRegistrations:", error);
    return out;
  }
  for (const r of data ?? []) {
    const id = (r as { eventId: string }).eventId;
    out[id] = (out[id] ?? 0) + 1;
  }
  return out;
}
