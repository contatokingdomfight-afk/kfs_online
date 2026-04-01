import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente Supabase para Route Handlers (`app/api/...`).
 * Não usa React `cache()` — cada chamada cria uma instância fresca.
 */
export async function createRouteHandlerClient() {
  const cookieStore = await cookies();
  return createServerClient(
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
          } catch {
            // Route Handlers podem não conseguir setar cookies em certas situações
          }
        },
      },
    }
  );
}

/**
 * Verifica se o pedido tem sessão de utilizador com role ADMIN.
 * Retorna o userId (authUserId) se válido, ou null.
 */
export async function requireAdminForRoute(): Promise<{ adminOk: true } | { adminOk: false; status: number; error: string }> {
  try {
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return { adminOk: false, status: 401, error: "Sessão inválida ou expirada." };
    }

    const { data: dbUser, error: dbErr } = await supabase
      .from("User")
      .select("id, role")
      .eq("authUserId", user.id)
      .maybeSingle();

    if (dbErr || !dbUser) {
      return { adminOk: false, status: 401, error: "Utilizador não encontrado na base de dados." };
    }

    if (dbUser.role !== "ADMIN") {
      return { adminOk: false, status: 403, error: "Não autorizado." };
    }

    return { adminOk: true };
  } catch (e) {
    console.error("requireAdminForRoute error:", e);
    return { adminOk: false, status: 500, error: "Erro interno de autenticação." };
  }
}
