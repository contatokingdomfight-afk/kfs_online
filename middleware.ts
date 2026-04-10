import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Inclui `/auth/update-password`: link do email de reset traz `?code=`; tem de ser público antes da sessão existir. */
const publicPaths = [
  "/",
  "/sign-in",
  "/sign-up",
  "/aula-experimental",
  "/lista_espera",
  "/auth/callback",
  "/auth/forgot-password",
  "/auth/update-password",
];

/** Aluno sem plano: onboarding, escolher plano, callback OAuth e free tier (dashboard + biblioteca + perfil). */
const studentAllowedWithoutPlanPrefixes = ["/onboarding", "/escolher-plano", "/auth/callback", "/auth/update-password"];

function isPublicBrowserPath(pathname: string) {
  return publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isPublicApiPath(pathname: string) {
  return pathname === "/api/stripe/webhook" || pathname.startsWith("/api/cron/");
}

function isStudentAllowedWithoutPlan(pathname: string) {
  return studentAllowedWithoutPlanPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
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

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      "[middleware] Variáveis NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY em falta — verifica o ambiente (ex.: Vercel → Settings → Environment Variables)."
    );
    if (isPublicBrowserPath(pathname) || isPublicApiPath(pathname)) {
      return NextResponse.next({ request });
    }
    const u = request.nextUrl.clone();
    u.pathname = "/sign-in";
    u.search = "";
    return NextResponse.redirect(u);
  }

  try {
    let response = NextResponse.next({ request });

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (isPublicApiPath(pathname)) {
      return response;
    }

    if (!user) {
      if (isPublicBrowserPath(pathname)) {
        return response;
      }
      const url = request.nextUrl.clone();
      url.pathname = "/sign-in";
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
      .select("planId")
      .eq("userId", dbUser.id)
      .maybeSingle();

    if (student?.planId) {
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
      return NextResponse.next({ request });
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
