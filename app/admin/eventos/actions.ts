"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { parseEventDay } from "@/lib/event-form-dates";
import { createAdminClient } from "@/lib/supabase/admin";

const EVENT_TYPES = ["CAMP", "WORKSHOP"] as const;

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
      price,
      max_participants: maxParticipants,
      is_active: isActive,
    })
    .eq("id", eventId);

  if (error) return { error: error.message };
  revalidatePath("/admin/eventos");
  revalidatePath(`/admin/eventos/${eventId}`);
  revalidatePath("/dashboard/eventos");
  return {};
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
  const { error } = await supabase
    .from("EventRegistration")
    .update({ status })
    .eq("id", registrationId);
  if (error) return { error: error.message };
  revalidatePath("/admin/eventos");
  revalidatePath("/dashboard/eventos");
  return {};
}
