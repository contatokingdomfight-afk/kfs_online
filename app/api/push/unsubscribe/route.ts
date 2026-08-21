import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";

export async function POST(request: Request) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let endpoint = "";
  try {
    const body = (await request.json()) as { endpoint?: string };
    endpoint = body.endpoint?.trim() ?? "";
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (!endpoint) {
    return NextResponse.json({ error: "Endpoint em falta." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from("PushSubscription").delete().eq("endpoint", endpoint).eq("userId", dbUser.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
