import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/auth/sync-user";

/**
 * Callback OAuth (ex.: Google). Usa createClient() com cookies() do next/headers
 * para que os cookies de sessão sejam automaticamente incluídos na resposta de
 * redirect pelo Next.js (mecanismo interno de WorkAsyncStorage).
 * Em produção, usa x-forwarded-host para obter o domínio correto no Vercel.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextUrl = requestUrl.searchParams.get("next");

  // Em produção no Vercel, x-forwarded-host contém o domínio público correto.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const origin = forwardedHost
    ? `https://${forwardedHost}`
    : requestUrl.origin;

  const redirectPath = nextUrl && nextUrl.startsWith("/") ? nextUrl : "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/sign-in?error=missing_code`);
  }

  try {
    const supabase = await createClient();
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("Auth callback exchange error:", exchangeError);
      return NextResponse.redirect(`${origin}/sign-in?error=exchange_failed`);
    }

    const session = data?.session;
    if (session?.user) {
      try {
        await syncUser(session.user);
      } catch (syncErr) {
        console.error("Auth callback syncUser (non-fatal):", syncErr);
      }
    }
  } catch (error) {
    console.error("Error in auth callback:", error);
    return NextResponse.redirect(`${origin}/sign-in?error=auth_callback_error`);
  }

  return NextResponse.redirect(`${origin}${redirectPath}`);
}
