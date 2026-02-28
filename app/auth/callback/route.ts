import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/auth/sync-user";

/**
 * Rota de callback após OAuth (ex.: Google).
 * O Supabase redireciona para aqui com ?code=...; trocamos o code por sessão e sincronizamos o User/Student.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const nextUrl = searchParams.get("next");
  const origin = request.nextUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/sign-in?error=missing_code`);
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.error("Auth callback exchangeCodeForSession error:", exchangeError);
    return NextResponse.redirect(`${origin}/sign-in?error=exchange_failed`);
  }

  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();
  if (!supabaseUser) {
    return NextResponse.redirect(`${origin}/sign-in?error=no_user`);
  }

  try {
    await syncUser(supabaseUser);
  } catch (err) {
    console.error("Auth callback syncUser error:", err);
    // Mesmo com erro de sync, o utilizador está autenticado; redirecionamos e o sync pode ser retentado noutra request
  }

  const target =
    nextUrl && nextUrl.startsWith("/") && !nextUrl.startsWith("//")
      ? nextUrl
      : "/dashboard";
  return NextResponse.redirect(`${origin}${target}`);
}
