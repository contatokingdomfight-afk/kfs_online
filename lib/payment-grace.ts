/**
 * Pagamento em atraso: 5 dias úteis para regularizar; após o prazo, suspender como “sem plano”
 * guardando o plano em suspendedPlanId (histórico na BD mantém-se).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { addBusinessDaysUtc } from "@/lib/business-days";
import { createInAppNotification } from "@/lib/notifications/in-app";
import { stripe } from "@/lib/stripe/server";

type StudentGraceRow = {
  planId: string | null;
  paymentGraceEndsAt: string | null;
  paymentGraceReferenceMonth: string | null;
  paymentSuspendedAt: string | null;
  suspendedPlanId: string | null;
  stripeSubscriptionId?: string | null;
};

export async function startGracePeriodOnLatePayment(
  supabase: SupabaseClient,
  studentId: string,
  referenceMonth: string
): Promise<void> {
  const { data: st } = await supabase
    .from("Student")
    .select("planId, paymentGraceEndsAt, paymentGraceReferenceMonth, paymentSuspendedAt")
    .eq("id", studentId)
    .maybeSingle();

  const row = st as StudentGraceRow | null;
  if (!row?.planId || row.paymentSuspendedAt) return;

  const now = new Date();
  if (
    row.paymentGraceReferenceMonth === referenceMonth &&
    row.paymentGraceEndsAt &&
    new Date(row.paymentGraceEndsAt) > now
  ) {
    return;
  }

  const endsAt = addBusinessDaysUtc(new Date(), 5);
  await supabase
    .from("Student")
    .update({
      paymentGraceReferenceMonth: referenceMonth,
      paymentGraceEndsAt: endsAt.toISOString(),
    })
    .eq("id", studentId);

  const deadlineLabel = endsAt.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  await createInAppNotification(supabase, {
    studentId,
    type: "PAYMENT_OVERDUE",
    title: "Pagamento em atraso",
    body: `A mensalidade (${referenceMonth}) está em atraso. Tens 5 dias úteis para regularizar, até ${deadlineLabel}.`,
    href: "/dashboard/financeiro",
  });
}

export async function clearGraceOnPaidPayment(supabase: SupabaseClient, studentId: string): Promise<void> {
  const { data: st } = await supabase
    .from("Student")
    .select("planId, suspendedPlanId, paymentSuspendedAt, paymentGraceEndsAt, paymentGraceReferenceMonth")
    .eq("id", studentId)
    .maybeSingle();

  const row = st as StudentGraceRow | null;
  if (!row) return;

  const hadGrace = Boolean(row.paymentGraceEndsAt || row.paymentGraceReferenceMonth);
  const wasSuspended = Boolean(row.paymentSuspendedAt && row.suspendedPlanId);
  if (!hadGrace && !wasSuspended) return;

  const suspendedPlanId = row.suspendedPlanId;
  const updates: Record<string, unknown> = {
    paymentGraceEndsAt: null,
    paymentGraceReferenceMonth: null,
  };

  if (wasSuspended) {
    updates.paymentSuspendedAt = null;
    updates.suspendedPlanId = null;
    if (!row.planId && suspendedPlanId) {
      updates.planId = suspendedPlanId;
    }
  }

  await supabase.from("Student").update(updates).eq("id", studentId);

  if (wasSuspended) {
    await createInAppNotification(supabase, {
      studentId,
      type: "PAYMENT_RESTORED",
      title: "Acesso reposto",
      body: "O teu pagamento foi registado. O acesso ao plano foi reposto.",
      href: "/dashboard",
    });
  }
}

export async function suspendStudentsPastGrace(
  supabase: SupabaseClient
): Promise<{ suspended: number; errors: string[] }> {
  const nowIso = new Date().toISOString();
  const { data: rows } = await supabase
    .from("Student")
    .select("id, planId, stripeSubscriptionId, paymentGraceEndsAt")
    .not("planId", "is", null)
    .not("paymentGraceEndsAt", "is", null)
    .lt("paymentGraceEndsAt", nowIso)
    .is("paymentSuspendedAt", null);

  const errors: string[] = [];
  let suspended = 0;

  for (const raw of rows ?? []) {
    const row = raw as {
      id: string;
      planId: string;
      stripeSubscriptionId: string | null;
      paymentGraceEndsAt: string;
    };

    const subId = row.stripeSubscriptionId;
    if (subId && stripe) {
      try {
        await stripe.subscriptions.cancel(subId);
      } catch (e) {
        errors.push(`${row.id}: Stripe cancel: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    const { error } = await supabase
      .from("Student")
      .update({
        suspendedPlanId: row.planId,
        planId: null,
        stripeSubscriptionId: null,
        paymentSuspendedAt: new Date().toISOString(),
        paymentGraceEndsAt: null,
        paymentGraceReferenceMonth: null,
      })
      .eq("id", row.id);

    if (error) {
      errors.push(`${row.id}: ${error.message}`);
      continue;
    }

    suspended++;
    await createInAppNotification(supabase, {
      studentId: row.id,
      type: "PAYMENT_SUSPENDED",
      title: "Acesso suspenso por falta de pagamento",
      body: "O prazo de regularização terminou. Escolhe um plano ou regulariza o pagamento para voltar a ter acesso completo.",
      href: "/escolher-plano",
    });
  }

  return { suspended, errors };
}
