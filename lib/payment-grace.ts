/**
 * Atraso: após o fim do dia 8 do mês em Lisboa sem PAID (registo LATE).
 * Prazo para regularizar: 15 dias corridos após o dia 8; depois suspende o plano.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { endOfGracePeriodLisbon, LISBON_TZ } from "@/lib/lisbon-payment-dates";
import { createInAppNotification } from "@/lib/notifications/in-app";
import { stripe } from "@/lib/stripe/server";
import { syncStudentPaymentStatus } from "@/lib/student-payment-status";
import { getFamilyContext } from "@/lib/family-context";
import { syncFamilyMembersOnTitularPayment, syncFamilyMembersOnTitularSuspension } from "@/lib/family-group";

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

  const endsAt = endOfGracePeriodLisbon(referenceMonth);
  await supabase
    .from("Student")
    .update({
      paymentGraceReferenceMonth: referenceMonth,
      paymentGraceEndsAt: endsAt.toISOString(),
    })
    .eq("id", studentId);

  const deadlineLabel = new Intl.DateTimeFormat("pt-PT", {
    timeZone: LISBON_TZ,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(endsAt);

  await createInAppNotification(supabase, {
    studentId,
    type: "PAYMENT_OVERDUE",
    title: "Pagamento em atraso",
    body: `A mensalidade (${referenceMonth}) está em atraso (após o dia 8). Regulariza até ${deadlineLabel}, para evitar bloqueio de acesso.`,
    href: "/dashboard/financeiro",
  });

  await syncStudentPaymentStatus(supabase, studentId);
}

export async function clearGraceOnPaidPayment(supabase: SupabaseClient, studentId: string): Promise<void> {
  const { data: st } = await supabase
    .from("Student")
    .select("planId, suspendedPlanId, paymentSuspendedAt, paymentGraceEndsAt, paymentGraceReferenceMonth")
    .eq("id", studentId)
    .maybeSingle();

  const row = st as StudentGraceRow | null;
  if (!row) return;

  const suspendedPlanId = row.suspendedPlanId;
  const hadGrace = Boolean(row.paymentGraceEndsAt || row.paymentGraceReferenceMonth);
  const wasSuspended = Boolean(row.paymentSuspendedAt && suspendedPlanId);
  const needsPlanRestore = !row.planId && Boolean(suspendedPlanId);
  if (!hadGrace && !wasSuspended && !needsPlanRestore) return;

  const updates: Record<string, unknown> = {
    paymentGraceEndsAt: null,
    paymentGraceReferenceMonth: null,
  };

  if (wasSuspended || needsPlanRestore) {
    if (wasSuspended) {
      updates.paymentSuspendedAt = null;
      updates.suspendedPlanId = null;
    }
    if (!row.planId && suspendedPlanId) {
      updates.planId = suspendedPlanId;
      if (!wasSuspended) {
        updates.suspendedPlanId = null;
      }
    }
  }

  const { error } = await supabase.from("Student").update(updates).eq("id", studentId);
  if (error) {
    console.error(`clearGraceOnPaidPayment: failed for ${studentId}:`, error.message);
    return;
  }

  if (wasSuspended || needsPlanRestore) {
    await createInAppNotification(supabase, {
      studentId,
      type: "PAYMENT_RESTORED",
      title: "Acesso reposto",
      body: "O teu pagamento foi registado. O acesso ao plano foi reposto.",
      href: "/dashboard",
    });
  }

  await syncStudentPaymentStatus(supabase, studentId);

  const familyCtx = await getFamilyContext(supabase, studentId);
  if (familyCtx?.isTitular) {
    await syncFamilyMembersOnTitularPayment(supabase, studentId);
  }
}

/** Suspende alunos com plano cujo prazo (15 dias corridos após o dia 8) já passou. */
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

  const list = (rows ?? []) as {
    id: string;
    planId: string;
    stripeSubscriptionId: string | null;
    paymentGraceEndsAt: string;
  }[];

  const BATCH = 15;
  for (let i = 0; i < list.length; i += BATCH) {
    const chunk = list.slice(i, i + BATCH);
    await Promise.all(
      chunk.map(async (row) => {
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
          return;
        }

        suspended++;
        await createInAppNotification(supabase, {
          studentId: row.id,
          type: "PAYMENT_SUSPENDED",
          title: "Acesso suspenso por falta de pagamento",
          body: "O prazo de regularização terminou. Escolhe um plano ou regulariza o pagamento para voltar a ter acesso completo.",
          href: "/escolher-plano",
        });
        await syncStudentPaymentStatus(supabase, row.id);

        const familyCtx = await getFamilyContext(supabase, row.id);
        if (familyCtx?.isTitular) {
          await syncFamilyMembersOnTitularSuspension(supabase, row.id, row.planId);
        }
      })
    );
  }

  return { suspended, errors };
}
