import "server-only";

import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getVapidPrivateKey, getVapidPublicKey, getVapidSubject, isWebPushConfigured } from "@/lib/push/vapid";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

function configureVapid() {
  const publicKey = getVapidPublicKey();
  const privateKey = getVapidPrivateKey();
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(getVapidSubject(), publicKey, privateKey);
  return true;
}

/** Envia push a todas as subscrições do utilizador (ignora endpoints expirados). */
export async function sendWebPushToUser(
  supabase: SupabaseClient,
  userId: string,
  payload: PushPayload
): Promise<void> {
  if (!isWebPushConfigured() || !configureVapid()) return;

  const { data: rows } = await supabase
    .from("PushSubscription")
    .select("id, endpoint, p256dh, auth")
    .eq("userId", userId);

  if (!rows?.length) return;

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/dashboard/notificacoes",
  });

  for (const row of rows) {
    const sub = row as { id: string; endpoint: string; p256dh: string; auth: string };
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        body
      );
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await supabase.from("PushSubscription").delete().eq("id", sub.id);
      } else {
        console.error("[sendWebPushToUser]", status, sub.endpoint);
      }
    }
  }
}
