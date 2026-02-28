/**
 * Notificações in-app (guardadas na BD, visíveis no dashboard do aluno).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type NotificationType = "PRESENCE_CONFIRMED";

export async function createPresenceConfirmedNotification(
  supabase: SupabaseClient,
  studentId: string,
  payload: { modality: string; date: string; startTime: string; endTime: string }
): Promise<void> {
  const modalityLabels: Record<string, string> = {
    MUAY_THAI: "Muay Thai",
    BOXING: "Boxing",
    KICKBOXING: "Kickboxing",
  };
  const modalityLabel = modalityLabels[payload.modality] ?? payload.modality;
  const dateFormatted = formatDateShort(payload.date);
  const title = "Presença confirmada";
  const body = `${modalityLabel}, ${dateFormatted}, ${payload.startTime} – ${payload.endTime}`;

  await supabase.from("Notification").insert({
    id: crypto.randomUUID(),
    studentId,
    type: "PRESENCE_CONFIRMED",
    title,
    body,
    created_at: new Date().toISOString(),
  });
}

function formatDateShort(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return dateStr;
  }
}
