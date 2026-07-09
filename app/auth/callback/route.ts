import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { syncUser } from "@/lib/auth/sync-user";
import {
  REMEMBER_DEVICE_COOKIE_NAME,
  rememberLongSessionFromCookieValue,
  resolveSupabaseCookieOptions,
} from "@/lib/supabase/cookie-options";

/** Erros do PostgREST vêm como objeto `{ message, code, details }`, não como `Error`. */
function formatErrorForQueryParam(err: unknown, maxLen = 450): string {
  if (err instanceof Error) return truncate(err.message, maxLen);
  if (err && typeof err === "object") {
    const o = err as Record<string, unknown>;
    const msg = typeof o.message === "string" ? o.message : null;
    const code = typeof o.code === "string" ? o.code : null;
    const details = typeof o.details === "string" ? o.details : null;
    const hint = typeof o.hint === "string" ? o.hint : null;
    if (msg) {
      const parts = [msg, code && `code=${code}`, details && details, hint && `hint=${hint}`].filter(Boolean);
      return truncate(parts.join(" | "), maxLen);
    }
  }
  try {
    return truncate(JSON.stringify(err), maxLen);
  } catch {
    return truncate(String(err), maxLen);
  }
}

function truncate(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen - 3)}...`;
}

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
