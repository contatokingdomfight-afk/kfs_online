import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { syncUser } from "@/lib/auth/sync-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { isShopNextPath, isShopOnlyUser, SHOP_ONLY_METADATA_KEY } from "@/lib/auth/shop-only";
import { formatErrorForQueryParam } from "@/lib/auth/format-error-for-query-param";
import {
  REMEMBER_DEVICE_COOKIE_NAME,
  rememberLongSessionFromCookieValue,
  resolveSupabaseCookieOptions,
} from "@/lib/supabase/cookie-options";

/**
 * OAuth callback no servidor: lê o PKCE code-verifier dos cookies (escritos no sign-in)
 * e devolve a sessão nos cookies da resposta de redirect.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const redirectTo = next && next.startsWith("/") ? next : "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/sign-in?error=missing_code", origin));
  }

  const cookieStore = await cookies();
  const rememberLong = rememberLongSessionFromCookieValue(
    cookieStore.get(REMEMBER_DEVICE_COOKIE_NAME)?.value
  );

  let response = NextResponse.redirect(new URL(redirectTo, origin));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: resolveSupabaseCookieOptions(rememberLong),
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
          });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession error:", error.message, error.status);
    return NextResponse.redirect(
      new URL(`/sign-in?error=exchange_failed&msg=${encodeURIComponent(error.message)}`, origin)
    );
  }

  const sessionUser = data.session?.user;
  if (sessionUser) {
    // Google a partir da Academy/Loja: conta nova → «só loja» (o email/senha marca-se no sign-up).
    const isNewAccount = Date.now() - new Date(sessionUser.created_at).getTime() < 5 * 60_000;
    if (isShopNextPath(next) && isNewAccount && !isShopOnlyUser(sessionUser)) {
      const { error: metaErr } = await createAdminClient().auth.admin.updateUserById(sessionUser.id, {
        user_metadata: { ...sessionUser.user_metadata, [SHOP_ONLY_METADATA_KEY]: true },
      });
      if (metaErr) console.error("[auth/callback] marcar conta só-loja falhou:", metaErr.message);
    }
    try {
      await syncUser(sessionUser);
    } catch (e) {
      console.error("[auth/callback] syncUser falhou:", e);
      const detail = encodeURIComponent(formatErrorForQueryParam(e));
      return NextResponse.redirect(new URL(`/sign-in?reason=sync-failed&detail=${detail}`, origin));
    }
  }

  return response;
}
