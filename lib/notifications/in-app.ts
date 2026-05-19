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
  | "PHYSICAL_ASSESSMENT"
  | "PHYSICAL_ASSESSMENT_REQUEST"
  | "TRIBE_COMMENT";

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

type CoachInsertPayload = {
  coachUserId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  href?: string | null;
};

/** Central de notificações do professor (mesma tabela `Notification`, coluna `coachUserId`). */
export async function createCoachInAppNotification(supabase: SupabaseClient, payload: CoachInsertPayload): Promise<void> {
  const row: Record<string, unknown> = {
    id: crypto.randomUUID(),
    studentId: null,
    coachUserId: payload.coachUserId,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    created_at: new Date().toISOString(),
  };
  if (payload.href) row.href = payload.href;
  const { error } = await supabase.from("Notification").insert(row);
  if (error) console.error("[createCoachInAppNotification]", error.message, payload.type, payload.coachUserId);
}

/** Notifica todos os coaches ligados à escola quando um aluno solicita avaliação física. */
export async function notifyCoachesOfPhysicalAssessmentRequest(
  supabase: SupabaseClient,
  params: { schoolId: string; studentId: string }
): Promise<void> {
  const { data: links } = await supabase.from("CoachSchool").select("coachId").eq("schoolId", params.schoolId);
  const coachIds = [...new Set((links ?? []).map((l) => (l as { coachId?: string }).coachId).filter(Boolean))] as string[];
  if (coachIds.length === 0) return;

  const { data: coaches } = await supabase.from("Coach").select("userId").in("id", coachIds);
  const coachUserIds = [...new Set((coaches ?? []).map((c) => (c as { userId?: string }).userId).filter(Boolean))] as string[];
  if (coachUserIds.length === 0) return;

  const { data: stud } = await supabase.from("Student").select("userId").eq("id", params.studentId).maybeSingle();
  let studentLabel = "Um aluno";
  const studRow = stud as { userId?: string | null } | null;
  if (studRow?.userId) {
    const { data: u } = await supabase.from("User").select("name").eq("id", studRow.userId).maybeSingle();
    const name = (u as { name?: string | null } | null)?.name?.trim();
    if (name) studentLabel = name;
  }

  const title = "Pedido de avaliação física";
  const body = `${studentLabel} pediu uma avaliação física na tua escola.`;
  const href = `/coach/alunos/${params.studentId}/avaliacao-fisica`;

  for (const coachUserId of coachUserIds) {
    await createCoachInAppNotification(supabase, {
      coachUserId,
      type: "PHYSICAL_ASSESSMENT_REQUEST",
      title,
      body,
      href,
    });
  }
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
