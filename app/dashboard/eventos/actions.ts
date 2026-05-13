"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { createInAppNotification } from "@/lib/notifications/in-app";
import { notifyAllAdminsOfEventRegistrationPending } from "@/lib/notifications/notify-admins";

export async function registerForEvent(eventId: string): Promise<{ error?: string }> {
  const studentId = await getCurrentStudentId();
  if (!studentId) return { error: "Sessão inválida. Faça login como aluno." };

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("Event")
    .select("id, name, is_active, event_date, end_date, max_participants")
    .eq("id", eventId)
    .single();

  if (!event || !event.is_active) return { error: "Evento não encontrado ou não disponível." };
  const eventName = String(event.name ?? "Evento");
  const today = new Date().toISOString().slice(0, 10);
  const lastDay = ((event as { end_date?: string | null }).end_date ?? event.event_date).slice(0, 10);
  if (lastDay < today) return { error: "As inscrições para este evento já terminaram." };

  if (event.max_participants != null) {
    const { count } = await supabase
      .from("EventRegistration")
      .select("id", { count: "exact", head: true })
      .eq("eventId", eventId);
    if (count != null && count >= event.max_participants) return { error: "Lotação esgotada." };
  }

  const { error } = await supabase.from("EventRegistration").insert({
    studentId,
    eventId,
    status: "PENDING",
  });

  if (error) {
    if (error.code === "23505") return { error: "Já estás inscrito neste evento." };
    console.error("registerForEvent error:", error);
    return { error: error.message };
  }

  let studentLabel = "Um aluno";
  const { data: stud } = await supabase.from("Student").select("userId").eq("id", studentId).maybeSingle();
  if (stud?.userId) {
    const { data: u } = await supabase.from("User").select("name").eq("id", stud.userId).maybeSingle();
    const nm = (u as { name?: string | null } | null)?.name?.trim();
    if (nm) studentLabel = nm;
  }

  try {
    await createInAppNotification(supabase, {
      studentId,
      type: "GENERAL",
      title: "Pedido de inscrição em evento",
      body: `Enviamos o teu pedido para «${eventName}». Quando for confirmado, vês o estado em Cursos e Eventos.`,
      href: "/dashboard/eventos",
    });
  } catch (e) {
    console.error("[registerForEvent] student notification", e);
  }

  await notifyAllAdminsOfEventRegistrationPending({
    eventId,
    eventName,
    studentLabel,
  });

  revalidatePath("/dashboard/eventos");
  revalidatePath("/dashboard/notificacoes");
  revalidatePath("/admin/notificacoes");
  return {};
}
