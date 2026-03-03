import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { syncUser } from "@/lib/auth/sync-user";

/**
 * Callback OAuth (ex.: Google). Troca o code por sessão, sincroniza User/Student
 * na mesma requisição (evita falha no primeiro carregamento do dashboard) e redireciona.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextUrl = requestUrl.searchParams.get("next");
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();

    try {
      const { data: { session }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        console.error("Auth callback exchange error:", exchangeError);
        return NextResponse.redirect(`${origin}/sign-in?error=auth_callback_error`);
      }
      // Sincronizar User/Student logo no callback para o primeiro carregamento do dashboard já ter dados
      if (session?.user) {
        try {
          await syncUser(session.user);
        } catch (syncErr) {
          console.error("Auth callback syncUser (non-fatal):", syncErr);
          // Continua e redireciona; na próxima requisição o sync pode correr
        }
      }
    } catch (error) {
      console.error("Error in auth callback:", error);
      return NextResponse.redirect(`${origin}/sign-in?error=auth_callback_error`);
    }
  }

  const safeNext = nextUrl && nextUrl.startsWith("/") ? nextUrl : "/dashboard";
  return NextResponse.redirect(`${origin}${safeNext}`);
}
