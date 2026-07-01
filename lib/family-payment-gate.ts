/**
 * Gate de pagamento para alunos (Edge-safe: só queries Supabase).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/** Aluno desbloqueado: tem pelo menos um pagamento PAID próprio ou acesso admin. */
export async function studentHasPaymentUnlock(
  supabase: SupabaseClient,
  studentId: string,
  adminGrantedFullAccess: boolean
): Promise<boolean> {
  if (adminGrantedFullAccess) return true;

  const { count: ownPaid } = await supabase
    .from("Payment")
    .select("id", { count: "exact", head: true })
    .eq("studentId", studentId)
    .eq("status", "PAID");

  return (ownPaid ?? 0) > 0;
}
