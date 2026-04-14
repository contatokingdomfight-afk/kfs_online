import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/auth/sync-user";

/**
 * Obtém o utilizador atual (Supabase) e devolve o User da nossa BD já sincronizado.
 * Retorna null se não houver sessão.
 * Cache por request: evita chamar syncUser várias vezes na mesma renderização (layout + page).
 *
 * Fallback: se syncUser falhar (ex.: SUPABASE_SERVICE_ROLE_KEY não configurada em Vercel),
 * tenta ler o utilizador diretamente da BD com o client anon+sessão (RLS).
 * Isto garante que utilizadores já existentes não são bloqueados enquanto a key não é corrigida.
 */
export const getCurrentDbUser = cache(async function getCurrentDbUser() {
  const supabase = await createClient();
  // Alinhar ao middleware: refrescar sessão a partir dos cookies antes de validar o JWT.
  await supabase.auth.getSession();
  const { data } = await supabase.auth.getUser();
  const user = data?.user ?? null;
  if (!user) return null;
  try {
    const { user: dbUser } = await syncUser(user);
    return dbUser;
  } catch (err) {
    console.error("[getCurrentDbUser] syncUser falhou — SUPABASE_SERVICE_ROLE_KEY pode estar ausente/errada no Vercel:", err);
    // Fallback: lê o utilizador existente com o client de sessão (sem criar/atualizar)
    try {
      const { data: fallbackUser } = await supabase
        .from("User")
        .select("id, authUserId, email, name, role, createdAt, avatarUrl")
        .eq("authUserId", user.id)
        .maybeSingle();
      if (fallbackUser) return fallbackUser;
    } catch (fallbackErr) {
      console.error("[getCurrentDbUser] Fallback de leitura também falhou:", fallbackErr);
    }
    return null;
  }
});

/**
 * Mesma lógica que `getCurrentDbUser`, sem `cache()` — usar em Route Handlers (`app/api/...`)
 * para evitar interacções estranhas do React cache com o contexto do pedido HTTP.
 */
export async function getCurrentDbUserUncached() {
  const supabase = await createClient();
  await supabase.auth.getSession();
  const { data } = await supabase.auth.getUser();
  const user = data?.user ?? null;
  if (!user) return null;
  try {
    const { user: dbUser } = await syncUser(user);
    return dbUser;
  } catch (err) {
    console.error("[getCurrentDbUserUncached] syncUser falhou — SUPABASE_SERVICE_ROLE_KEY pode estar ausente/errada no Vercel:", err);
    try {
      const { data: fallbackUser } = await supabase
        .from("User")
        .select("id, authUserId, email, name, role, createdAt, avatarUrl")
        .eq("authUserId", user.id)
        .maybeSingle();
      if (fallbackUser) return fallbackUser;
    } catch (fallbackErr) {
      console.error("[getCurrentDbUserUncached] Fallback de leitura também falhou:", fallbackErr);
    }
    return null;
  }
}
