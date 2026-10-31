import { NextRequest, NextResponse } from "next/server";
import { getCurrentDbUserUncached } from "@/lib/auth/get-current-user";
import { paymentSecretsConfigured } from "@/lib/payment-secrets";
import { resolveBankConfig, saveBankConnection } from "@/lib/revolut/bank-accounts";
import { exchangeAuthorizationCode } from "@/lib/revolut/client";
import { revolutMerchantEnv } from "@/lib/revolut/merchant";
import { syncRevolutTransactions } from "@/lib/revolut/reconcile";
import { getSchoolScope, isNetworkScope } from "@/lib/school-scope";
import { createAdminClient } from "@/lib/supabase/admin";

/** Volta da Revolut com o código de autorização: guarda o refresh token cifrado (só servidor) e faz a 1.ª sincronização. */
export async function GET(request: NextRequest) {
  const user = await getCurrentDbUserUncached();
  if (!user || user.role !== "ADMIN") return NextResponse.redirect(new URL("/sign-in", request.url));
  if (!isNetworkScope(await getSchoolScope())) return NextResponse.redirect(new URL("/admin/financeiro/banco", request.url));

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expected = request.cookies.get("revolut_oauth_state")?.value;
  // A escola vem no estado, por isso o estado tem de bater sempre certo com o cookie.
  if (!state || state !== expected) return NextResponse.redirect(new URL("/admin/financeiro/banco?erro=estado", request.url));
  const schoolId = state.slice(state.indexOf(".") + 1);
  const back = (q: string) => NextResponse.redirect(new URL(`/admin/financeiro/banco?school=${encodeURIComponent(schoolId)}&${q}`, request.url));

  if (!code) return back("erro=sem-codigo");
  if (!paymentSecretsConfigured(revolutMerchantEnv)) return back("erro=cifra");
  const supabase = createAdminClient();
  const cfg = await resolveBankConfig(supabase, schoolId);
  if (!cfg) return back("erro=config");

  try {
    const tokens = await exchangeAuthorizationCode(cfg, code);
    if (!tokens.refresh_token) return back("erro=sem-token");
    const saved = await saveBankConnection(supabase, { schoolId, refreshToken: tokens.refresh_token, actorUserId: user.id });
    if (saved.error) return back("erro=gravar");
    await syncRevolutTransactions(supabase, schoolId);
    const res = back("ligado=1");
    res.cookies.set("revolut_oauth_state", "", { path: "/", maxAge: 0 });
    return res;
  } catch (e) {
    console.error("[revolut callback]", e);
    return back("erro=troca");
  }
}
