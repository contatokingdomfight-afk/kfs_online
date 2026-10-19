import { NextRequest, NextResponse } from "next/server";
import { getCurrentDbUserUncached } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeAuthorizationCode, getRevolutConfig } from "@/lib/revolut/client";
import { syncRevolutTransactions } from "@/lib/revolut/reconcile";

/** Volta da Revolut com o código de autorização: guarda o refresh token (só servidor) e faz a 1.ª sincronização. */
export async function GET(request: NextRequest) {
  const back = (q: string) => NextResponse.redirect(new URL(`/admin/financeiro/banco?${q}`, request.url));
  const user = await getCurrentDbUserUncached();
  if (!user || user.role !== "ADMIN") return NextResponse.redirect(new URL("/sign-in", request.url));
  const cfg = getRevolutConfig();
  if (!cfg) return back("erro=config");
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expected = request.cookies.get("revolut_oauth_state")?.value;
  if (!code) return back("erro=sem-codigo");
  if (expected && state && expected !== state) return back("erro=estado");

  try {
    const tokens = await exchangeAuthorizationCode(cfg, code);
    if (!tokens.refresh_token) return back("erro=sem-token");
    const supabase = createAdminClient();
    const { error } = await supabase.from("RevolutConnection").upsert(
      { id: "default", refreshToken: tokens.refresh_token, connectedByUserId: user.id, connectedAt: new Date().toISOString(), lastSyncError: null },
      { onConflict: "id" }
    );
    if (error) return back("erro=gravar");
    await syncRevolutTransactions(supabase);
    const res = back("ligado=1");
    res.cookies.set("revolut_oauth_state", "", { path: "/", maxAge: 0 });
    return res;
  } catch (e) {
    console.error("[revolut callback]", e);
    return back("erro=troca");
  }
}
