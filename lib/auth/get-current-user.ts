import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/auth/sync-user";

/**
 * Obtém o utilizador atual (Supabase) e devolve o User da nossa BD já sincronizado.
 * Retorna null se não houver sessão.
 * Cache por request: evita chamar syncUser várias vezes na mesma renderização (layout + page).
 */
export const getCurrentDbUser = cache(async function getCurrentDbUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { user: dbUser } = await syncUser(user);
  return dbUser;
});
