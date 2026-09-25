import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { EmailOtpType } from "@supabase/supabase-js";
import { syncUser } from "@/lib/auth/sync-user";
import { formatErrorForQueryParam } from "@/lib/auth/format-error-for-query-param";
import {
  REMEMBER_DEVICE_COOKIE_NAME,
  rememberLongSessionFromCookieValue,
  resolveSupabaseCookieOptions,
} from "@/lib/supabase/cookie-options";

/** `next` pode vir como caminho relativo ou, vindo de `{{ .RedirectTo }}` do template, como URL absoluta. */
function resolveNextPath(next: string | null, origin: string): string {
  if (!next) return "/dashboard";
  if (next.startsWith("/")) return next;
  try {
    const u = new URL(next);
    if (u.origin === origin) return `${u.pathname}${u.search}` || "/dashboard";
  } catch {
    /* não é uma URL absoluta válida — ignora */
  }
  return "/dashboard";
}

/**
 * Confirmação de email (signup / recuperação de password / convite) via `token_hash` + `verifyOtp`.
 *
 * Ao contrário de /auth/callback (troca de `code` PKCE, que exige o code-verifier guardado em
 * cookie no MESMO browser/contexto que pediu o login — ok para OAuth, que é sempre a mesma aba),
 * este fluxo não depende de nada guardado no dispositivo: o `token_hash` sozinho basta para validar
 * a sessão. Isto é o que a Supabase recomenda para links de email, porque o link é aberto muitas
 * vezes noutro contexto do que o pedido original — no iPhone, por exemplo, a app Mail costuma abrir
 * o link numa vista separada da PWA instalada ou do Safari normal, que não partilha os cookies da
 * PWA; com /auth/callback isso rebentava a troca do código (o code-verifier simplesmente não estava
 * lá) e mandava o aluno para /sign-in com "Falha ao iniciar sessão" mesmo com o email já confirmado
 * do lado da Supabase.
 *
 * Exige alterar o template de email na Supabase (Authentication → Email Templates) para apontar
 * directamente para aqui com `{{ .TokenHash }}` em vez do link por omissão — ver DOCS/AUTH_EMAIL_CONFIRM.md.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const redirectTo = resolveNextPath(searchParams.get("next"), origin);

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL("/sign-in?error=missing_token", origin));
  }

  const cookieStore = await cookies();
  const rememberLong = rememberLongSessionFromCookieValue(
    cookieStore.get(REMEMBER_DEVICE_COOKIE_NAME)?.value
  );

  const response = NextResponse.redirect(new URL(redirectTo, origin));

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

  const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) {
    console.error("[auth/confirm] verifyOtp error:", error.message, error.status, "type:", type);
    return NextResponse.redirect(
      new URL(`/sign-in?error=verify_failed&msg=${encodeURIComponent(error.message)}`, origin)
    );
  }

  const sessionUser = data.session?.user ?? data.user;
  if (sessionUser) {
    try {
      await syncUser(sessionUser);
    } catch (e) {
      console.error("[auth/confirm] syncUser falhou:", e);
      const detail = encodeURIComponent(formatErrorForQueryParam(e));
      return NextResponse.redirect(new URL(`/sign-in?reason=sync-failed&detail=${detail}`, origin));
    }
  }

  return response;
}
