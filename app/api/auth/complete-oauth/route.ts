import { NextResponse } from "next/server";
import { syncUser } from "@/lib/auth/sync-user";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";

/** Após exchange PKCE no browser, cria/atualiza User+Student antes do redirect. */
export async function POST() {
  const supabase = await createRouteHandlerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message ?? "Sessão não encontrada após OAuth." },
      { status: 401 }
    );
  }

  try {
    await syncUser(data.user);
  } catch (e) {
    const message = e instanceof Error ? e.message : "syncUser falhou.";
    console.error("[complete-oauth] syncUser:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
