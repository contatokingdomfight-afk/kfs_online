/**
 * Recompensa de indicação de amigos: quando um aluno indicado (via link
 * `/aula-experimental?ref=<studentId>`) se torna aluno pagante, o indicador ganha
 * XP (sempre) e um crédito na mensalidade seguinte (só quem paga presencial —
 * quem paga por Stripe não tem hoje forma segura de aplicar desconto automático).
 *
 * Chamado sempre que um pagamento de mensalidade (TUITION) de um aluno passa a PAID
 * pela primeira vez — ver app/api/stripe/webhook/route.ts e app/admin/financeiro/actions.ts.
 * A guarda de idempotência é `Student.referralRewardGrantedAt` no aluno indicado:
 * só dispara uma vez por indicado, mesmo que o pagamento seja processado mais que uma vez.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createInAppNotification } from "@/lib/notifications/in-app";

export const REFERRAL_XP_REWARD = 100;
export const REFERRAL_CREDIT_AMOUNT = Number(process.env.REFERRAL_CREDIT_AMOUNT ?? 10);

async function awardXpToReferrer(supabase: SupabaseClient, studentId: string): Promise<void> {
  const { data: existing } = await supabase.from("Athlete").select("id, xp").eq("studentId", studentId).maybeSingle();
  if (existing?.id) {
    const currentXp = (existing.xp as number | null) ?? 0;
    await supabase.from("Athlete").update({ xp: currentXp + REFERRAL_XP_REWARD }).eq("id", existing.id);
    return;
  }
  await supabase.from("Athlete").insert({ id: crypto.randomUUID(), studentId, xp: REFERRAL_XP_REWARD });
}

/**
 * Concede a recompensa de indicação ao indicador de `referredStudentId`, se aplicável.
 * Não faz nada se o aluno não veio de indicação ou se a recompensa já foi atribuída.
 */
export async function grantReferralRewardIfEligible(
  supabase: SupabaseClient,
  referredStudentId: string
): Promise<void> {
  const { data: referred } = await supabase
    .from("Student")
    .select("id, userId, referredByStudentId, referralRewardGrantedAt")
    .eq("id", referredStudentId)
    .maybeSingle();
  if (!referred?.referredByStudentId || referred.referralRewardGrantedAt) return;

  const referrerId = referred.referredByStudentId as string;
  const { data: referrer } = await supabase
    .from("Student")
    .select("id, userId, stripeSubscriptionId")
    .eq("id", referrerId)
    .maybeSingle();
  if (!referrer) return;

  const { data: friendUser } = await supabase.from("User").select("name").eq("id", referred.userId).maybeSingle();
  const friendName = (friendUser?.name as string | null)?.trim() || "O teu amigo";

  await awardXpToReferrer(supabase, referrerId);

  const paysByStripe = Boolean((referrer as { stripeSubscriptionId?: string | null }).stripeSubscriptionId);
  let creditGranted = false;
  if (!paysByStripe) {
    const { error } = await supabase.from("ReferralCredit").insert({
      id: crypto.randomUUID(),
      studentId: referrerId,
      amount: REFERRAL_CREDIT_AMOUNT.toFixed(2),
      reason: `Indicação: ${friendName}`,
      referredStudentId,
    });
    creditGranted = !error;
  }

  await supabase.from("Student").update({ referralRewardGrantedAt: new Date().toISOString() }).eq("id", referredStudentId);

  const creditLine = creditGranted
    ? ` e um crédito de ${REFERRAL_CREDIT_AMOUNT.toFixed(2)}€ na tua próxima mensalidade`
    : "";
  await createInAppNotification(supabase, {
    studentId: referrerId,
    type: "REFERRAL_REWARD",
    title: "A tua indicação valeu a pena! 🎉",
    body: `${friendName} tornou-se aluno(a) — ganhaste ${REFERRAL_XP_REWARD} XP${creditLine}.`,
    href: "/dashboard/perfil",
  });
}
