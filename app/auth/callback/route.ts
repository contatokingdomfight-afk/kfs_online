import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Route Handler server-side para o callback OAuth do Supabase.
 *
 * O browser envia o ?code= e os cookies (incluindo o code-verifier PKCE).
 * O servidor troca o código por sessão e escreve os tokens via Set-Cookie.
 * Isso garante que a sessão está nos cookies ANTES de chegar ao dashboard,
 * sem depender de document.cookie do browser.
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

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (e) {
            console.error("[auth/callback] setAll error:", e);
          }
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

  console.log("[auth/callback] sessão criada:", data.session?.user?.email, "→ redirect para", redirectTo);
  return NextResponse.redirect(new URL(redirectTo, origin));
}
