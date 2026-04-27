"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";

export async function markNotificationRead(notificationId: string): Promise<{ ok?: boolean; error?: string }> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) return { error: "Sessão inválida." };

  const supabase = await createClient();
  const studentId = await getCurrentStudentId();

  if (studentId) {
    const { data: row } = await supabase
      .from("Notification")
      .select("id")
      .eq("id", notificationId)
      .eq("studentId", studentId)
      .maybeSingle();
    if (!row) return { error: "Notificação não encontrada." };
  } else if (dbUser.role === "COACH" || dbUser.role === "ADMIN") {
    const { data: row } = await supabase
      .from("Notification")
      .select("id")
      .eq("id", notificationId)
      .eq("coachUserId", dbUser.id)
      .maybeSingle();
    if (!row) return { error: "Notificação não encontrada." };
  } else {
    return { error: "Sessão inválida." };
  }

  const { error } = await supabase.from("Notification").update({ read_at: new Date().toISOString() }).eq("id", notificationId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/notificacoes");
  revalidatePath("/coach");
  revalidatePath("/coach/notificacoes");
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<{ ok?: boolean; error?: string }> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) return { error: "Sessão inválida." };

  const supabase = await createClient();
  const readAt = new Date().toISOString();
  const studentId = await getCurrentStudentId();

  if (studentId) {
    const { data: unread } = await supabase.from("Notification").select("id").eq("studentId", studentId).is("read_at", null);
    const ids = (unread ?? []).map((r) => r.id);
    if (ids.length === 0) return { ok: true };

    const { error } = await supabase.from("Notification").update({ read_at: readAt }).in("id", ids);
    if (error) return { error: error.message };

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/notificacoes");
    return { ok: true };
  }

  if (dbUser.role === "COACH" || dbUser.role === "ADMIN") {
    const { data: unread } = await supabase.from("Notification").select("id").eq("coachUserId", dbUser.id).is("read_at", null);
    const ids = (unread ?? []).map((r) => r.id);
    if (ids.length === 0) return { ok: true };

    const { error } = await supabase.from("Notification").update({ read_at: readAt }).in("id", ids);
    if (error) return { error: error.message };

    revalidatePath("/coach");
    revalidatePath("/coach/notificacoes");
    return { ok: true };
  }

  return { error: "Sessão inválida." };
}
