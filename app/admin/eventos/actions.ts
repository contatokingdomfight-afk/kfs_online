"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { parseEventDay } from "@/lib/event-form-dates";
import { normalizeTimeForDb } from "@/lib/event-times";
import { createAdminClient } from "@/lib/supabase/admin";

const EVENT_TYPES = ["CAMP", "WORKSHOP", "OTHER"] as const;

export type EventFormResult = { error?: string };

export async function createEvent(
  _prev: EventFormResult | null,
  formData: FormData
): Promise<EventFormResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const type = (formData.get("type") as string)?.trim();
  const startDate = (formData.get("start_date") as string)?.trim();
  const endDate = (formData.get("end_date") as string)?.trim();
  const startTimeRaw = (formData.get("start_time") as string)?.trim() ?? "";
  const endTimeRaw = (formData.get("end_time") as string)?.trim() ?? "";
  const location = (formData.get("location") as string)?.trim() || null;
  const bannerUrl = (formData.get("banner_url") as string)?.trim() || null;
  const priceStr = (formData.get("price") as string)?.trim();
  const maxParticipantsStr = (formData.get("max_participants") as string)?.trim();
  const isActive = formData.get("is_active") !== "off" && formData.get("is_active") !== "false";

  if (!name) return { error: "Nome do evento é obrigatório." };
  if (!type || !EVENT_TYPES.includes(type as (typeof EVENT_TYPES)[number])) return { error: "Tipo inválido." };
  if (!startDate) return { error: "Data de início é obrigatória." };
  if (!endDate) return { error: "Data de fim é obrigatória." };
  const startDay = parseEventDay(startDate);
  const endDay = parseEventDay(endDate);
  if (!startDay.ok) return { error: "Data de início inválida. Use o formato AAAA-MM-DD." };
  if (!endDay.ok) return { error: "Data de fim inválida. Use o formato AAAA-MM-DD." };
  if (startDay.utcMs > endDay.utcMs)
    return { error: "A data de fim deve ser igual ou posterior à data de início." };

  const hasStartT = Boolean(startTimeRaw);
  const hasEndT = Boolean(endTimeRaw);
  if (hasStartT !== hasEndT) {
    return { error: "Indique hora de início e hora de fim, ou deixe ambas em branco." };
  }
  let startTimeDb: string | null = null;
  let endTimeDb: string | null = null;
  if (hasStartT) {
    startTimeDb = normalizeTimeForDb(startTimeRaw);
    endTimeDb = normalizeTimeForDb(endTimeRaw);
    if (!startTimeDb || !endTimeDb) return { error: "Hora inválida." };
    if (startDay.iso === endDay.iso && startTimeDb >= endTimeDb) {
      return { error: "No mesmo dia, a hora de fim deve ser posterior à hora de início." };
    }
  }

  const price = priceStr ? parseFloat(priceStr) : 0;
  if (isNaN(price) || price < 0) return { error: "Preço inválido." };
  const maxParticipants = maxParticipantsStr ? parseInt(maxParticipantsStr, 10) : null;
  if (maxParticipants != null && (isNaN(maxParticipants) || maxParticipants < 0)) return { error: "Lotação inválida." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("Event").insert({
    name,
    description,
    type,
    start_date: startDay.iso,
    end_date: endDay.iso,
    event_date: startDay.iso,
    start_time: startTimeDb,
    end_time: endTimeDb,
    location,
    banner_url: bannerUrl,
    price,
    max_participants: maxParticipants,
    is_active: isActive,
  });

  if (error) {
    console.error("createEvent error:", error);
    return { error: error.message };
  }
  revalidatePath("/admin/eventos");
  revalidatePath("/dashboard/eventos");
  redirect("/admin/eventos");
}

export async function updateEvent(
  _prev: EventFormResult | null,
  formData: FormData
): Promise<EventFormResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const eventId = (formData.get("eventId") as string)?.trim();
  if (!eventId) return { error: "ID do evento inválido." };

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const type = (formData.get("type") as string)?.trim();
  const startDate = (formData.get("start_date") as string)?.trim();
  const endDate = (formData.get("end_date") as string)?.trim();
  const startTimeRaw = (formData.get("start_time") as string)?.trim() ?? "";
  const endTimeRaw = (formData.get("end_time") as string)?.trim() ?? "";
  const location = (formData.get("location") as string)?.trim() || null;
  const bannerUrl = (formData.get("banner_url") as string)?.trim() || null;
  const priceStr = (formData.get("price") as string)?.trim();
  const maxParticipantsStr = (formData.get("max_participants") as string)?.trim();
  const isActive = formData.get("is_active") !== "off" && formData.get("is_active") !== "false";

  if (!name) return { error: "Nome do evento é obrigatório." };
  if (!type || !EVENT_TYPES.includes(type as (typeof EVENT_TYPES)[number])) return { error: "Tipo inválido." };
  if (!startDate) return { error: "Data de início é obrigatória." };
  if (!endDate) return { error: "Data de fim é obrigatória." };
  const startDay = parseEventDay(startDate);
  const endDay = parseEventDay(endDate);
  if (!startDay.ok) return { error: "Data de início inválida. Use o formato AAAA-MM-DD." };
  if (!endDay.ok) return { error: "Data de fim inválida. Use o formato AAAA-MM-DD." };
  if (startDay.utcMs > endDay.utcMs)
    return { error: "A data de fim deve ser igual ou posterior à data de início." };

  const hasStartT = Boolean(startTimeRaw);
  const hasEndT = Boolean(endTimeRaw);
  if (hasStartT !== hasEndT) {
    return { error: "Indique hora de início e hora de fim, ou deixe ambas em branco." };
  }
  let startTimeDb: string | null = null;
  let endTimeDb: string | null = null;
  if (hasStartT) {
    startTimeDb = normalizeTimeForDb(startTimeRaw);
    endTimeDb = normalizeTimeForDb(endTimeRaw);
    if (!startTimeDb || !endTimeDb) return { error: "Hora inválida." };
    if (startDay.iso === endDay.iso && startTimeDb >= endTimeDb) {
      return { error: "No mesmo dia, a hora de fim deve ser posterior à hora de início." };
    }
  }

  const price = priceStr ? parseFloat(priceStr) : 0;
  if (isNaN(price) || price < 0) return { error: "Preço inválido." };
  const maxParticipants = maxParticipantsStr ? parseInt(maxParticipantsStr, 10) : null;
  if (maxParticipants != null && (isNaN(maxParticipants) || maxParticipants < 0)) return { error: "Lotação inválida." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("Event")
    .update({
      name,
      description,
      type,
      start_date: startDay.iso,
      end_date: endDay.iso,
      event_date: startDay.iso,
      start_time: startTimeDb,
      end_time: endTimeDb,
      location,
      banner_url: bannerUrl,
      price,
      max_participants: maxParticipants,
      is_active: isActive,
    })
    .eq("id", eventId);

  if (error) return { error: error.message };
  revalidatePath("/admin/eventos");
  revalidatePath(`/admin/eventos/${eventId}`);
  revalidatePath("/dashboard/eventos");
  redirect("/admin/eventos");
}

export async function deleteEvent(eventId: string): Promise<{ error?: string }> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };
  if (!eventId?.trim()) return { error: "ID do evento inválido." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("Event").delete().eq("id", eventId.trim());
  if (error) return { error: error.message };
  revalidatePath("/admin/eventos");
  revalidatePath("/dashboard/eventos");
  redirect("/admin/eventos");
}

export async function setRegistrationStatus(
  registrationId: string,
  status: "PENDING" | "CONFIRMED"
): Promise<{ error?: string }> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const supabase = createAdminClient();
  const rid = registrationId.trim();
  if (!rid) return { error: "ID inválido." };

  if (status === "CONFIRMED") {
    const { data: row, error: selErr } = await supabase
      .from("EventRegistration")
      .select("checkin_token, eventId")
      .eq("id", rid)
      .maybeSingle();
    if (selErr) return { error: selErr.message };
    const eventIdForPath = (row as { eventId?: string } | null)?.eventId;
    let skipQrToken = false;
    if (eventIdForPath) {
      const { data: ev } = await supabase.from("Event").select("type").eq("id", eventIdForPath).maybeSingle();
      if ((ev as { type?: string } | null)?.type === "OTHER") skipQrToken = true;
    }
    const existing = (row as { checkin_token?: string | null } | null)?.checkin_token?.trim();
    const payload = skipQrToken
      ? { status: "CONFIRMED" as const, checkin_token: null }
      : { status: "CONFIRMED" as const, checkin_token: existing || randomBytes(24).toString("hex") };
    const { error } = await supabase.from("EventRegistration").update(payload).eq("id", rid);
    if (error) return { error: error.message };
    if (eventIdForPath) revalidatePath(`/admin/eventos/${eventIdForPath}`);
  } else {
    const { data: row } = await supabase.from("EventRegistration").select("eventId").eq("id", rid).maybeSingle();
    const eventIdForPath = (row as { eventId?: string } | null)?.eventId;
    const { error } = await supabase.from("EventRegistration").update({ status }).eq("id", rid);
    if (error) return { error: error.message };
    if (eventIdForPath) revalidatePath(`/admin/eventos/${eventIdForPath}`);
  }

  revalidatePath("/admin/eventos");
  revalidatePath("/dashboard/eventos");
  return {};
}

export type RedeemTicketResult =
  | { ok: true; eventName: string; studentName: string }
  | { ok: false; error: string };

type RegCheckinRow = {
  id: string;
  status: string;
  checkin_used_at: string | null;
  eventId: string;
  studentId: string;
};

async function executeEventCheckin(
  supabase: ReturnType<typeof createAdminClient>,
  reg: RegCheckinRow,
  eid: string
): Promise<RedeemTicketResult> {
  if (reg.status !== "CONFIRMED") return { ok: false, error: "Inscrição ainda não está confirmada." };
  if (reg.checkin_used_at) return { ok: false, error: "Este ingresso já foi utilizado." };

  const { data: updated, error: upErr } = await supabase
    .from("EventRegistration")
    .update({ checkin_used_at: new Date().toISOString() })
    .eq("id", reg.id)
    .eq("eventId", eid)
    .is("checkin_used_at", null)
    .select("id")
    .maybeSingle();

  if (upErr) return { ok: false, error: upErr.message };
  if (!updated) return { ok: false, error: "Este ingresso já foi utilizado." };

  const { data: event } = await supabase.from("Event").select("name").eq("id", reg.eventId).maybeSingle();
  const { data: student } = await supabase.from("Student").select("userId").eq("id", reg.studentId).maybeSingle();
  let studentName = "Aluno";
  if (student?.userId) {
    const { data: u } = await supabase.from("User").select("name").eq("id", student.userId).maybeSingle();
    if (u?.name?.trim()) studentName = u.name.trim();
  }

  revalidatePath("/admin/eventos");
  revalidatePath(`/admin/eventos/${eid}/validar`);
  revalidatePath(`/admin/eventos/${eid}`);
  revalidatePath("/dashboard/eventos");
  return { ok: true, eventName: (event as { name?: string })?.name ?? "Evento", studentName };
}

/**
 * Marca o ingresso como utilizado (entrada registada). Só ADMIN.
 * `eventId` tem de coincidir com o evento do ingresso (validação por evento).
 */
export async function redeemEventTicket(checkinToken: string, eventId: string): Promise<RedeemTicketResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { ok: false, error: "Não autorizado." };

  const token = checkinToken.trim();
  const eid = eventId.trim();
  if (!eid) return { ok: false, error: "Evento inválido." };
  if (!/^[a-f0-9]{48}$/i.test(token)) return { ok: false, error: "Código de ingresso inválido." };

  const supabase = createAdminClient();
  const { data: reg, error: findErr } = await supabase
    .from("EventRegistration")
    .select("id, status, checkin_used_at, eventId, studentId")
    .eq("checkin_token", token)
    .eq("eventId", eid)
    .maybeSingle();

  if (findErr) return { ok: false, error: findErr.message };
  if (!reg) return { ok: false, error: "Ingresso não encontrado para este evento." };

  return executeEventCheckin(supabase, reg as RegCheckinRow, eid);
}

/**
 * Check-in manual por ID de inscrição (lista por nome). Só ADMIN.
 */
export async function redeemEventCheckinByRegistrationId(
  registrationId: string,
  eventId: string
): Promise<RedeemTicketResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { ok: false, error: "Não autorizado." };

  const rid = registrationId.trim();
  const eid = eventId.trim();
  if (!rid || !eid) return { ok: false, error: "Dados inválidos." };

  const supabase = createAdminClient();
  const { data: reg, error: findErr } = await supabase
    .from("EventRegistration")
    .select("id, status, checkin_used_at, eventId, studentId")
    .eq("id", rid)
    .eq("eventId", eid)
    .maybeSingle();

  if (findErr) return { ok: false, error: findErr.message };
  if (!reg) return { ok: false, error: "Inscrição não encontrada neste evento." };

  return executeEventCheckin(supabase, reg as RegCheckinRow, eid);
}
