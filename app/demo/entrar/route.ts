import { NextResponse } from "next/server";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { DEMO_ACCOUNTS, parseDemoRole } from "@/lib/demo";
import { VIEW_AS_COOKIE } from "@/lib/view-as";

export const dynamic = "force-dynamic";

/**
 * Entrada na demo sem palavra-passe: gera um magic link para a conta demo (sem enviar email)
 * e segue para /auth/confirm, que cria a sessão com os cookies normais.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const role = parseDemoRole(searchParams.get("como"));
  if (!role) return NextResponse.redirect(new URL("/sign-in", origin));

  const admin = getAdminClientOrNull().client;
  if (!admin) return NextResponse.redirect(new URL("/sign-in?error=demo_unavailable", origin));

  const account = DEMO_ACCOUNTS[role];
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: account.email });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) {
    console.error("[demo] generateLink", error?.message);
    return NextResponse.redirect(new URL("/sign-in?error=demo_unavailable", origin));
  }

  const target = new URL("/auth/confirm", origin);
  target.searchParams.set("token_hash", tokenHash);
  target.searchParams.set("type", "magiclink");
  target.searchParams.set("next", account.home);
  const response = NextResponse.redirect(target);
  response.headers.set("Cache-Control", "no-store");
  // Um admin que experimente a demo não deve ficar preso no «ver como».
  response.cookies.set(VIEW_AS_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
