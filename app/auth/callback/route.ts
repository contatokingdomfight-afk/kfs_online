import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";
import { syncUser } from "@/lib/auth/sync-user";

/**
 * Route Handler server-side para o callback OAuth do Supabase.
 *
 * O browser envia o ?code= e os cookies (incluindo o code-verifier PKCE).
 * O servidor troca o código por sessão e escreve os tokens via Set-Cookie
 * (com as mesmas cookieOptions que o resto da app).
 *
 * Depois chama syncUser(session.user) para garantir User/Student na BD antes
 * do redirect — evita corrida em que o dashboard renderiza sem linha em User.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const redirectTo = next && next.startsWith("/") ? next : "/dashboard";

  console.log("[auth/callback] code presente:", !!code, "| next:", redirectTo);

  if (!code) {
    console.error("[auth/callback] Sem ?code= na URL");
    return NextResponse.redirect(new URL("/sign-in?error=missing_code", origin));
  }

  const supabase = await createRouteHandlerClient();

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession error:", error.message, error.status);
    return NextResponse.redirect(
      new URL(`/sign-in?error=exchange_failed&msg=${encodeURIComponent(error.message)}`, origin)
    );
  }

  const sessionUser = data.session?.user;
  if (sessionUser) {
    try {
      await syncUser(sessionUser);
    } catch (e) {
      console.error("[auth/callback] syncUser falhou:", e);
      const detail = encodeURIComponent(String(e instanceof Error ? e.message : e));
      return NextResponse.redirect(new URL(`/sign-in?reason=sync-failed&detail=${detail}`, origin));
    }
  }

  console.log("[auth/callback] sessão + BD OK:", sessionUser?.email, "→", redirectTo);
  return NextResponse.redirect(new URL(redirectTo, origin));
}
