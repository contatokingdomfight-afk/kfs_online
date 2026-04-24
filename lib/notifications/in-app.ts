/**
 * Notificações in-app (tabela Supabase `Notification`, visíveis na central do aluno).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type NotificationType =
  | "PRESENCE_CONFIRMED"
  | "GENERAL"
  | "PAYMENT_OVERDUE"
  | "PAYMENT_SUSPENDED"
  | "PAYMENT_RESTORED"
  | "COACH_EVALUATION"
  | "PHYSICAL_ASSESSMENT";

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
  const { error } = await supabase.from("Notification").insert(row);
  if (error) console.error("[createInAppNotification]", error.message, payload.type, payload.studentId);
}

/** Central de notificações do aluno: nova avaliação de desempenho (AthleteEvaluation). */
export async function notifyStudentOfNewCoachEvaluation(
  supabase: SupabaseClient,
  params: { studentId: string; coachId: string }
): Promise<void> {
  const { data: coach } = await supabase.from("Coach").select("userId").eq("id", params.coachId).maybeSingle();
  let coachLabel = "O teu treinador";
  const coachRow = coach as { userId?: string | null } | null;
  if (coachRow?.userId) {
    const { data: user } = await supabase.from("User").select("name").eq("id", coachRow.userId).maybeSingle();
    const name = (user as { name?: string | null } | null)?.name?.trim();
    if (name) coachLabel = name;
  }

  await createInAppNotification(supabase, {
    studentId: params.studentId,
    type: "COACH_EVALUATION",
    title: "Nova avaliação do treinador",
    body: `${coachLabel} registou uma nova avaliação sobre o teu desempenho.`,
    href: "/dashboard/performance",
  });
}

/** Central de notificações: nova ficha de anamnese / avaliação física (`StudentPhysicalAssessment`). */
export async function notifyStudentOfNewPhysicalAssessment(
  supabase: SupabaseClient,
  params: { studentId: string; coachId: string }
): Promise<void> {
  const { data: coach } = await supabase.from("Coach").select("userId").eq("id", params.coachId).maybeSingle();
  let coachLabel = "O teu treinador";
  const coachRow = coach as { userId?: string | null } | null;
  if (coachRow?.userId) {
    const { data: user } = await supabase.from("User").select("name").eq("id", coachRow.userId).maybeSingle();
    const name = (user as { name?: string | null } | null)?.name?.trim();
    if (name) coachLabel = name;
  }

  await createInAppNotification(supabase, {
    studentId: params.studentId,
    type: "PHYSICAL_ASSESSMENT",
    title: "Nova avaliação física",
    body: `${coachLabel} registou a tua ficha de anamnese e avaliação física.`,
    href: "/dashboard/ficha-fisica",
  });
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
    MMA: "MMA",
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
