import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const publicPaths = ["/", "/sign-in", "/sign-up", "/aula-experimental", "/lista_espera", "/auth/callback"];

/** Aluno sem plano: onboarding, escolher plano, callback OAuth e free tier (dashboard + biblioteca + perfil). */
const studentAllowedWithoutPlanPrefixes = ["/onboarding", "/escolher-plano", "/auth/callback"];

function isPublicBrowserPath(pathname: string) {
  return publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isPublicApiPath(pathname: string) {
  return pathname === "/api/stripe/webhook" || pathname.startsWith("/api/cron/");
}

function isStudentAllowedWithoutPlan(pathname: string) {
  return studentAllowedWithoutPlanPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Free tier: explora agenda (só leitura), biblioteca em pré-visualização e perfil. */
function isStudentFreeTierPath(pathname: string) {
  if (pathname === "/dashboard") return true;
  if (pathname.startsWith("/dashboard/biblioteca")) return true;
  if (pathname.startsWith("/dashboard/perfil")) return true;
  return false;
}

/** Checkout Stripe: aluno autenticado ainda sem planId. */
function isStripeCheckoutApi(pathname: string) {
  return pathname === "/api/stripe/create-checkout-session";
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const pathname = request.nextUrl.pathname;

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
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
