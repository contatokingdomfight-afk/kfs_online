import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { syncUser } from "@/lib/auth/sync-user";
import { supabaseCookieOptions } from "@/lib/supabase/cookie-options";

/**
 * Callback OAuth (ex.: Google). Cria cliente Supabase manual (sem cache)
 * para garantir que os cookies de sessão são copiados para a resposta de redirect.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextUrl = requestUrl.searchParams.get("next");

  const forwardedHost = request.headers.get("x-forwarded-host");
  const origin = forwardedHost
    ? `https://${forwardedHost}`
    : requestUrl.origin;

  const redirectPath = nextUrl && nextUrl.startsWith("/") ? nextUrl : "/dashboard";

  console.log(`[callback] code=${!!code} origin=${origin} forwardedHost=${forwardedHost}`);
  console.log(`[callback] incoming cookies: ${request.cookies.getAll().map((c) => c.name).join(", ")}`);

  if (!code) {
    return NextResponse.redirect(`${origin}/sign-in?error=missing_code`);
  }

  const cookieStore: { name: string; value: string; options?: Record<string, unknown> }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: supabaseCookieOptions,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookieStore.push(...cookiesToSet);
        },
      },
    }
  );

  try {
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    const session = data?.session;

    console.log(`[callback] exchangeError=${JSON.stringify(exchangeError)} session=${!!session} cookieCount=${cookieStore.length}`);
    console.log(`[callback] cookieNames: ${cookieStore.map((c) => c.name).join(", ")}`);

    if (exchangeError) {
      console.error("[callback] exchange failed:", exchangeError);
      return NextResponse.redirect(`${origin}/sign-in?error=exchange_failed`);
    }

    if (session?.user) {
      try {
        await syncUser(session.user);
      } catch (syncErr) {
        console.error("[callback] syncUser (non-fatal):", syncErr);
      }
    }
  } catch (error) {
    console.error("[callback] unexpected error:", error);
    return NextResponse.redirect(`${origin}/sign-in?error=auth_callback_error`);
  }

  const response = NextResponse.redirect(`${origin}${redirectPath}`);
  cookieStore.forEach(({ name, value, options }) => {
    const opts = {
      path: "/",
      sameSite: "lax" as const,
      maxAge: 34560000,
      secure: process.env.NODE_ENV === "production",
      httpOnly: false,
      ...(options ?? {}),
    };
    response.cookies.set(name, value, opts);
  });
  console.log(`[callback] redirect to ${origin}${redirectPath} with ${cookieStore.length} cookies`);

  return response;
}
