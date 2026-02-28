import { createClient } from "@/lib/supabase/server";
import { syncUser } from "@/lib/auth/sync-user";

/**
 * Obtém o ID do Student do utilizador atual (para utilizadores que são alunos).
 * Retorna null se não houver sessão ou se o utilizador não tiver registo em Student.
 */
export async function getCurrentStudentId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();
  if (!supabaseUser) return null;

  const dbUser = await syncUser(supabaseUser);
  if (!dbUser) return null;

  const { data: student } = await supabase
    .from("Student")
    .select("id")
    .eq("userId", dbUser.id)
    .maybeSingle();

  return student?.id ?? null;
}
