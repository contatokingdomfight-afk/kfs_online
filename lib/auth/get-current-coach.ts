import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";

/**
 * Obtém o ID do Coach do utilizador atual (para utilizadores que são coach ou admin).
 * Retorna null se não houver sessão ou se o utilizador não tiver registo em Coach.
 */
export async function getCurrentCoachId(): Promise<string | null> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) return null;

  const supabase = await createClient();
  const { data: coach } = await supabase
    .from("Coach")
    .select("id")
    .eq("userId", dbUser.id)
    .maybeSingle();

  return coach?.id ?? null;
}
