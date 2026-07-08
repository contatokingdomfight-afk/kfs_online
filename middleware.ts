import { createServerClient } from "@supabase/ssr";
import { NextResponse, NextRequest } from "next/server";
import {
  REMEMBER_DEVICE_COOKIE_NAME,
  rememberLongSessionFromCookieValue,
  resolveSupabaseCookieOptions,
} from "@/lib/supabase/cookie-options";

/** Inclui `/auth/update-password`: link do email de reset traz `?code=`; tem de ser público antes da sessão existir. */
const publicPaths = [
  "/",
  "/sign-in",
  "/sign-up",
  "/aula-experimental",
  "/lista_espera",
  "/timer",
  "/auth/callback",
  "/auth/forgot-password",
  "/auth/update-password",
  "/termos",
  "/privacidade",
];

/** Aluno sem plano: onboarding, waiver, escolher plano, callback OAuth e free tier. */
const studentAllowedWithoutPlanPrefixes = [
  "/onboarding",
  "/waiver-signing",
  "/escolher-plano",
  "/auth/callback",
  "/auth/update-password",
];

function isPublicBrowserPath(pathname: string) {
  if (pathname === "/t" || pathname.startsWith("/t/")) return true;
  return publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isPublicApiPath(pathname: string) {
  return pathname === "/api/stripe/webhook" || pathname.startsWith("/api/cron/");
}

function isStudentAllowedWithoutPlan(pathname: string) {
  return studentAllowedWithoutPlanPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isOnboardingPath(pathname: string) {
  return pathname === "/onboarding" || pathname.startsWith("/onboarding/");
}

function isWaiverPath(pathname: string) {
  return pathname === "/waiver-signing" || pathname.startsWith("/waiver-signing/");
}

/** Free tier: explora agenda (só leitura), biblioteca em pré-visualização e perfil; check-in mostra mensagem se sem plano. */
function isStudentFreeTierPath(pathname: string) {
  if (pathname === "/dashboard") return true;
  if (pathname.startsWith("/dashboard/biblioteca")) return true;
  if (pathname.startsWith("/dashboard/perfil")) return true;
  if (pathname.startsWith("/dashboard/bem-estar")) return true;
  if (pathname.startsWith("/check-in/")) return true;
  return false;
}

/** Checkout Stripe: aluno autenticado ainda sem planId. */
function isStripeCheckoutApi(pathname: string) {
  return pathname === "/api/stripe/create-checkout-session";
}

/** Pagamento na escola pendente — início e área financeira até 1.º PAID. */
function isStudentAwaitingSchoolPaymentPath(pathname: string) {
  if (pathname === "/dashboard") return true;
  return pathname === "/dashboard/financeiro" || pathname.startsWith("/dashboard/financeiro/");
}

/**
 * Bots enviam POST multipart/form-data malformado; o Next.js tenta parsear como Server Action → 500.
 * Ver https://github.com/vercel/next.js/issues/81760
 */
function rejectMalformedMultipartPost(request: NextRequest): NextResponse | null {
  if (request.method !== "POST") return null;

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.startsWith("multipart/form-data")) return null;

  const contentLength = request.headers.get("content-length");
  if (!contentLength || contentLength === "0") {
    return new NextResponse(null, { status: 400 });
  }
  if (!contentType.includes("boundary=")) {
    return new NextResponse(null, { status: 400 });
  }
  return null;
}

/** Páginas públicas só-leitura sem Server Actions — POST é scanner/bot. */
const STATIC_PUBLIC_POST_BLOCKED = new Set(["/", "/termos", "/privacidade"]);

function rejectPostToStaticPublicPage(request: NextRequest, pathname: string): NextResponse | null {
  if (request.method !== "POST" || !STATIC_PUBLIC_POST_BLOCKED.has(pathname)) return null;
  if (request.headers.get("next-action")) return null;
  return new NextResponse(null, { status: 405 });
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const malformedMultipart = rejectMalformedMultipartPost(request);
  if (malformedMultipart) return malformedMultipart;

  const staticPostBlocked = rejectPostToStaticPublicPage(request, pathname);
  if (staticPostBlocked) return staticPostBlocked;

  function withKfsPathname(r: NextRequest) {
    const h = new Headers(r.headers);
    h.set("x-kfs-pathname", r.nextUrl.pathname);
    return new NextRequest(r, { headers: h });
  }

  /** Playground interno de silhueta: nunca em produção na Vercel. */
  if (pathname.startsWith("/dev/") && process.env.VERCEL_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  /**
   * OAuth (Google): se a Site URL no Supabase for só `http://localhost:3000` (ou raiz em prod.),
   * o utilizador volta a `/?code=...` em vez de `/auth/callback?code=...`.
   * O redirect na página inicial pode falhar com cache; aqui garantimos a rota de troca de código.
   */
  if (pathname === "/" && request.nextUrl.searchParams.has("code")) {
    const dest = request.nextUrl.clone();
    dest.pathname = "/auth/callback";
    return NextResponse.redirect(dest);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      "[middleware] Variáveis NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY em falta — verifica o ambiente (ex.: Vercel → Settings → Environment Variables)."
    );
    if (isPublicBrowserPath(pathname) || isPublicApiPath(pathname)) {
      return NextResponse.next({ request: withKfsPathname(request) });
    }
    const u = request.nextUrl.clone();
    u.pathname = "/sign-in";
    u.search = "";
    return NextResponse.redirect(u);
  }

  try {
    /**
     * Importante (Supabase + Next.js): ao refrescar a sessão, o cliente escreve cookies.
     * Só `response.cookies.set` não actualiza o pedido que os Server Components vão ler —
     * é preciso também `request.cookies.set` e recriar `NextResponse.next({ request })`.
     * Caso contrário o middleware vê o utilizador e o layout recebe cookies antigos →
     * `getUser()` falha e aparece `?reason=no-db-user`.
     */
    let response = NextResponse.next({ request: withKfsPathname(request) });

    const rememberLong = rememberLongSessionFromCookieValue(request.cookies.get(REMEMBER_DEVICE_COOKIE_NAME)?.value);
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookieOptions: resolveSupabaseCookieOptions(rememberLong),
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          // RequestCookies só aceita name+value; atributos (path, secure…) vão na resposta.
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request: withKfsPathname(request) });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
          });
        },
      },
    });

    // `getUser()` valida o JWT com o Auth e renova tokens em cookie quando expiram
    // (preferível a `getSession()`, que só lê cookies sem garantir refresh).
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user ?? null;

    if (isPublicApiPath(pathname)) {
      return response;
    }

    if (!user) {
      if (isPublicBrowserPath(pathname)) {
        return response;
      }
      const url = request.nextUrl.clone();
      url.pathname = "/sign-in";
      url.searchParams.set("reason", "middleware-no-user");
      if (pathname.startsWith("/check-in/")) {
        url.searchParams.set("next", pathname);
      }
      return NextResponse.redirect(url);
    }

    if (isStripeCheckoutApi(pathname)) {
      return response;
    }

    const { data: dbUser } = await supabase
      .from("User")
      .select("id, role")
      .eq("authUserId", user.id)
      .maybeSingle();

    if (!dbUser) {
      return response;
    }

    if (pathname.startsWith("/api/admin/") && dbUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
    }

    if (dbUser.role === "ADMIN" || dbUser.role === "COACH") {
      return response;
    }

    if (dbUser.role !== "ALUNO") {
      return response;
    }

    const { data: student } = await supabase
      .from("Student")
      .select("id, planId, adminGrantedFullAccess")
      .eq("userId", dbUser.id)
      .maybeSingle();

    if (!student?.id) {
      return response;
    }

    const [{ data: profile }, { data: waiver }] = await Promise.all([
      supabase
        .from("StudentProfile")
        .select("hasCompletedOnboarding")
        .eq("studentId", student.id)
        .maybeSingle(),
      supabase.from("StudentWaiver").select("waiverSigned").eq("studentId", student.id).maybeSingle(),
    ]);

    const onboardingDone = Boolean((profile as { hasCompletedOnboarding?: boolean } | null)?.hasCompletedOnboarding);
    const waiverSigned = Boolean((waiver as { waiverSigned?: boolean } | null)?.waiverSigned);

    if (!onboardingDone && !isOnboardingPath(pathname) && !isPublicBrowserPath(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (onboardingDone && !waiverSigned && !isWaiverPath(pathname) && !isOnboardingPath(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/waiver-signing";
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (student.planId) {
      const adminFree = Boolean((student as { adminGrantedFullAccess?: boolean }).adminGrantedFullAccess);
      if (!adminFree) {
        const { studentHasPaymentUnlock } = await import("@/lib/family-payment-gate");
        const hasAccess = await studentHasPaymentUnlock(supabase, student.id, adminFree);

        if (!hasAccess) {
          // Rotas de onboarding/waiver/escolher-plano e a área de pagamento não podem
          // ser bloqueadas pelo gate; caso contrário o check do waiver (acima) e o gate
          // entram em ciclo infinito (/waiver-signing ↔ /dashboard/financeiro).
          if (isStudentAwaitingSchoolPaymentPath(pathname) || isStudentAllowedWithoutPlan(pathname)) {
            return response;
          }
          if (pathname.startsWith("/api/")) {
            return NextResponse.json(
              { error: "Efectua o pagamento na secretaria para desbloquear o acesso." },
              { status: 403 }
            );
          }
          const url = request.nextUrl.clone();
          url.pathname = "/dashboard/financeiro";
          url.search = "";
          url.searchParams.set("pagamento_escola", "1");
          return NextResponse.redirect(url);
        }
      }

      return response;
    }

    if (isStudentAllowedWithoutPlan(pathname) || isStudentFreeTierPath(pathname)) {
      return response;
    }

    if (pathname === "/api/profile/avatar") {
      return response;
    }

    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "É necessário um plano ativo. Escolhe um plano para continuar." }, { status: 403 });
    }

    const url = request.nextUrl.clone();
    url.pathname = "/escolher-plano";
    url.search = "";
    return NextResponse.redirect(url);
  } catch (err) {
    console.error("[middleware] Erro não tratado (Edge):", err);
    if (isPublicBrowserPath(pathname) || isPublicApiPath(pathname)) {
      return NextResponse.next({ request: withKfsPathname(request) });
    }
    const fallback = request.nextUrl.clone();
    fallback.pathname = "/sign-in";
    fallback.search = "";
    fallback.searchParams.set("error", "middleware");
    return NextResponse.redirect(fallback);
  }
}

export const config = {
  matcher: [
    /* PWA: sw.js e manifest não podem ser interceptados (instalação / Lighthouse) */
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
