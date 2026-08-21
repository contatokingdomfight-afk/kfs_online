import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getVapidPublicKey } from "@/lib/push/vapid";

type SubscribeBody = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
};

export async function POST(request: Request) {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return NextResponse.json({ error: "Push não configurado." }, { status: 503 });
  }

  const dbUser = await getCurrentDbUser();
  if (!dbUser) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let body: SubscribeBody;
  try {
    body = (await request.json()) as SubscribeBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const endpoint = body.endpoint?.trim();
  const p256dh = body.keys?.p256dh?.trim();
  const auth = body.keys?.auth?.trim();
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Subscrição incompleta." }, { status: 400 });
  }

  const supabase = await createClient();
  await supabase.from("PushSubscription").delete().eq("endpoint", endpoint);
  const { error } = await supabase.from("PushSubscription").insert({
    id: crypto.randomUUID(),
    userId: dbUser.id,
    endpoint,
    p256dh,
    auth,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, publicKey });
}

export async function GET() {
  return NextResponse.json({ publicKey: getVapidPublicKey() });
}
