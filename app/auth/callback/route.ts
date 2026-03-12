import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { syncUser } from "@/lib/auth/sync-user";

/**
 * Callback OAuth (ex.: Google). Troca o code por sessão, sincroniza User/Student
 * e redireciona. Os cookies da sessão são definidos na resposta de redirect
 * para garantir que o utilizador fique logado.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextUrl = requestUrl.searchParams.get("next");
  const origin = requestUrl.origin;

  let redirectPath = nextUrl && nextUrl.startsWith("/") ? nextUrl : "/dashboard";

  if (code) {
    // Armazenar cookies para aplicar na resposta final
    const cookieStore: { name: string; value: string; options?: Record<string, unknown> }[] = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookieStore.length = 0;
            cookieStore.push(...cookiesToSet);
          },
        },
      }
    );

    try {
      const { data: { session }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        console.error("Auth callback exchange error:", exchangeError);
        return NextResponse.redirect(`${origin}/sign-in?error=auth_callback_error`);
      }
      // Sincronizar User/Student e decidir destino
      if (session?.user) {
        try {
          const { hasCompletedOnboarding } = await syncUser(session.user);
          if (!hasCompletedOnboarding) {
            redirectPath = "/onboarding";
          }
        } catch (syncErr) {
          console.error("Auth callback syncUser (non-fatal):", syncErr);
        }
      }
    } catch (error) {
      console.error("Error in auth callback:", error);
      return NextResponse.redirect(`${origin}/sign-in?error=auth_callback_error`);
    }

    // Criar redirect com os cookies da sessão aplicados
    const response = NextResponse.redirect(`${origin}${redirectPath}`);
    cookieStore.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options ?? {});
    });
    return response;
  }

  return NextResponse.redirect(`${origin}${redirectPath}`);
}
