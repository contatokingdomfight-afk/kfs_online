"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";

export async function registerForEvent(eventId: string): Promise<{ error?: string }> {
  const studentId = await getCurrentStudentId();
  if (!studentId) return { error: "Sessão inválida. Faça login como aluno." };

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("Event")
    .select("id, name, is_active, event_date, max_participants")
    .eq("id", eventId)
    .single();

  if (!event || !event.is_active) return { error: "Evento não encontrado ou não disponível." };
  const today = new Date().toISOString().slice(0, 10);
  if (event.event_date < today) return { error: "As inscrições para este evento já terminaram." };

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
  revalidatePath("/dashboard/eventos");
  return {};
}
