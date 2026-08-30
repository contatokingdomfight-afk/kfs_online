import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Contas com role ADMIN por vezes têm também uma linha Student (testes/demo).
 * Usado para excluir essas linhas das métricas de negócio do dashboard.
 */
export async function fetchAdminUserIdSet(supabase: SupabaseClient): Promise<Set<string>> {
  const { data } = await supabase.from("User").select("id").eq("role", "ADMIN");
  return new Set((data ?? []).map((u) => (u as { id: string }).id));
}
