import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendWebPushToUser } from "@/lib/push/send-web-push";
import { isWebPushConfigured } from "@/lib/push/vapid";

type StudentNotificationPayload = {
  studentId: string;
  title: string;
  body: string | null;
  href?: string | null;
};

/** Mirror opcional da notificação in-app para Web Push (se o aluno activou). */
export async function sendWebPushForStudentNotification(
  supabase: SupabaseClient,
  payload: StudentNotificationPayload
): Promise<void> {
  if (!isWebPushConfigured()) return;
  const { data: student } = await supabase.from("Student").select("userId").eq("id", payload.studentId).maybeSingle();
  const userId = (student as { userId?: string } | null)?.userId;
  if (!userId) return;
  await sendWebPushToUser(supabase, userId, {
    title: payload.title,
    body: payload.body ?? "",
    url: payload.href ?? "/dashboard/notificacoes",
  });
}
