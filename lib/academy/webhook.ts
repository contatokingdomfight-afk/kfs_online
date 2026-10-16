import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_CREATOR_PCT } from "@/lib/academy/access";

/** Mantém o Passe Kingdom Academy da conta alinhado com a subscrição do Stripe. */
export async function upsertAcademyPass(supabase: SupabaseClient, sub: Stripe.Subscription): Promise<void> {
  const userId = sub.metadata?.userId;
  if (!userId) return;
  const periodEndUnix =
    (sub as unknown as { current_period_end?: number }).current_period_end ??
    (sub.items?.data?.[0] as unknown as { current_period_end?: number } | undefined)?.current_period_end;
  const customer = sub.customer;
  const { error } = await supabase.from("AcademyPass").upsert(
    {
      userId,
      stripeCustomerId: typeof customer === "string" ? customer : customer?.id ?? null,
      stripeSubscriptionId: sub.id,
      interval: sub.metadata?.interval === "year" ? "year" : "month",
      status: sub.status,
      currentPeriodEnd: periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null,
      cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      updatedAt: new Date().toISOString(),
    },
    { onConflict: "userId" }
  );
  if (error) throw error;
}

/** Compra avulsa paga: dá acesso ao curso e regista a parte do professor (idempotente por sessão). */
export async function recordAcademyCoursePurchase(supabase: SupabaseClient, session: Stripe.Checkout.Session): Promise<void> {
  const courseId = session.metadata?.courseId;
  const userId = session.metadata?.userId;
  if (!courseId || !userId) return;
  const { data: existing } = await supabase.from("CoursePurchase").select("id").eq("stripeSessionId", session.id).maybeSingle();
  if (existing) return;

  const amount = (session.amount_total ?? 0) / 100;
  const { data: student } = await supabase
    .from("Student")
    .select("id")
    .eq("userId", userId)
    .order("createdAt", { ascending: true })
    .limit(1)
    .maybeSingle();
  const { data: purchase, error } = await supabase
    .from("CoursePurchase")
    .insert({
      studentId: (student as { id: string } | null)?.id ?? null,
      userId,
      courseId,
      amount,
      status: "PAID",
      stripeSessionId: session.id,
      stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return;
    throw error;
  }

  const { data: course } = await supabase.from("Course").select("creator_student_id, coach_revenue_pct").eq("id", courseId).maybeSingle();
  const c = course as { creator_student_id: string | null; coach_revenue_pct: number | null } | null;
  if (!c?.creator_student_id) return;
  const pct = c.coach_revenue_pct ?? DEFAULT_CREATOR_PCT;
  const creatorAmount = Math.round(amount * pct) / 100;
  const { error: saleErr } = await supabase.from("CourseSale").insert({
    purchaseId: (purchase as { id: string }).id,
    courseId,
    creatorStudentId: c.creator_student_id,
    grossAmount: amount.toFixed(2),
    creatorPct: pct,
    creatorAmount: creatorAmount.toFixed(2),
    schoolAmount: (Math.round((amount - creatorAmount) * 100) / 100).toFixed(2),
  });
  if (saleErr && saleErr.code !== "23505") throw saleErr;
}
