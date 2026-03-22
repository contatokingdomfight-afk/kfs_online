/**
 * Notificações in-app (tabela Supabase `Notification`, visíveis na central do aluno).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type NotificationType =
  | "PRESENCE_CONFIRMED"
  | "GENERAL"
  | "PAYMENT_OVERDUE"
  | "PAYMENT_SUSPENDED"
  | "PAYMENT_RESTORED";

type InsertPayload = {
  studentId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  href?: string | null;
};

export async function createInAppNotification(supabase: SupabaseClient, payload: InsertPayload): Promise<void> {
  const row: Record<string, unknown> = {
    id: crypto.randomUUID(),
    studentId: payload.studentId,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    created_at: new Date().toISOString(),
  };
  if (payload.href) row.href = payload.href;
  await supabase.from("Notification").insert(row);
}

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

  await createInAppNotification(supabase, {
    studentId,
    type: "PRESENCE_CONFIRMED",
    title,
    body,
    href: "/dashboard/historico",
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
