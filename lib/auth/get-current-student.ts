import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";

/**
 * Obtém o ID do Student do utilizador atual (para utilizadores que são alunos).
 * Retorna null se não houver sessão ou se o utilizador não tiver registo em Student.
 * Usa getCurrentDbUser (em cache por request) para evitar syncUser duplicado.
 */
export async function getCurrentStudentId(): Promise<string | null> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) return null;

  const supabase = await createClient();
  const { data: student } = await supabase
    .from("Student")
    .select("id")
    .eq("userId", dbUser.id)
    .maybeSingle();

  return student?.id ?? null;
}
