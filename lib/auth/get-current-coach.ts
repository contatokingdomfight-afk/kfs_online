import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";

/**
 * Obtém o ID do Coach do utilizador atual (para utilizadores que são coach ou admin).
 * Retorna null se não houver sessão, não tiver registo em Coach, ou se o coach estiver inativo (e o user não for ADMIN).
 */
export async function getCurrentCoachId(): Promise<string | null> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) return null;

  const supabase = await createClient();
  const { data: coach } = await supabase
    .from("Coach")
    .select("id, is_active")
    .eq("userId", dbUser.id)
    .maybeSingle();

  if (!coach) return null;
  const isActive = (coach as { is_active?: boolean }).is_active !== false;
  if (dbUser.role === "COACH" && !isActive) return null;
  return coach.id;
}
