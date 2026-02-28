import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/auth/sync-user";

/**
 * Obtém o utilizador atual (Supabase) e devolve o User da nossa BD já sincronizado.
 * Retorna null se não houver sessão.
 */
export async function getCurrentDbUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return syncUser(user);
}
