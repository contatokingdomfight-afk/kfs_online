import { createAdminClient } from "@/lib/supabase/admin";
import { createCoachInAppNotification } from "@/lib/notifications/in-app";

/**
 * Destinatário em `coachUserId` é qualquer `User.id` (coach ou admin) — mesmo campo na tabela `Notification`.
 */
export async function notifyAllAdminsOfEventRegistrationPending(opts: {
  eventId: string;
  eventName: string;
  studentLabel: string;
}): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { data: admins, error: aErr } = await supabase.from("User").select("id").eq("role", "ADMIN");
    if (aErr || !admins?.length) return;
    const body = `${opts.studentLabel} pediu inscrição em «${opts.eventName}» (pendente de confirmação).`;
    for (const row of admins) {
      const id = (row as { id?: string }).id;
      if (!id) continue;
      await createCoachInAppNotification(supabase, {
        coachUserId: id,
        type: "GENERAL",
        title: "Nova inscrição em evento",
        body,
        href: `/admin/eventos/${opts.eventId}`,
      });
    }
  } catch (e) {
    console.error("[notifyAllAdminsOfEventRegistrationPending]", e);
  }
}
