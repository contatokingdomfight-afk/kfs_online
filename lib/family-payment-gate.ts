/**
 * Gate de pagamento para alunos (Edge-safe: só queries Supabase).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getFamilyContext } from "@/lib/family-context";
import { isWithinSignupGracePeriod } from "@/lib/signup-grace";

/**
 * Aluno desbloqueado: tem pelo menos um pagamento PAID próprio, acesso admin, ou ainda
 * está nas 72h de carência após assinar a adesão (`agreementSignedAt`).
 * Membro de família (não-titular) nunca tem Payment próprio — chega aqui só quando
 * `Student.planId` já está definido (garantido pelo middleware antes de chamar isto),
 * o que já significa que o titular está em dia (senão a cascata tinha suspendido o membro).
 */
export async function studentHasPaymentUnlock(
  supabase: SupabaseClient,
  studentId: string,
  adminGrantedFullAccess: boolean,
  agreementSignedAt?: string | null
): Promise<boolean> {
  if (adminGrantedFullAccess) return true;
  if (isWithinSignupGracePeriod(agreementSignedAt)) return true;

  const familyCtx = await getFamilyContext(supabase, studentId);
  if (familyCtx && !familyCtx.isTitular) return true;

  const { count: ownPaid } = await supabase
    .from("Payment")
    .select("id", { count: "exact", head: true })
    .eq("studentId", studentId)
    .eq("status", "PAID");

  return (ownPaid ?? 0) > 0;
}
