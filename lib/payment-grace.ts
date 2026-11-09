/**
 * Atraso: após o fim do dia de pagamento do aluno (Student.paymentDueDay, omissão 5) sem PAID.
 * Prazo para regularizar: 15 dias corridos após o dia de pagamento; depois suspende o plano.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { endOfGracePeriodLisbon, isPastDueDay, normalizeDueDay, todayYmdLisbon, currentReferenceMonthLisbon, previousReferenceMonthLisbon, LISBON_TZ } from "@/lib/lisbon-payment-dates";
import { loadOpenPause, loadPausesByStudent, isPauseActiveOn } from "@/lib/tuition-pause";
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
  paymentDueDay?: number | null;
};

export async function startGracePeriodOnLatePayment(
  supabase: SupabaseClient,
  studentId: string,
  referenceMonth: string
): Promise<void> {
  const { data: st } = await supabase
    .from("Student")
    .select("planId, paymentGraceEndsAt, paymentGraceReferenceMonth, paymentSuspendedAt, paymentDueDay")
    .eq("id", studentId)
    .maybeSingle();

  const row = st as StudentGraceRow | null;
  if (!row?.planId || row.paymentSuspendedAt) return;

  // Ainda dentro do prazo (dia de pagamento do aluno): não há atraso nem aviso — o cron diário trata depois.
  const dueDay = normalizeDueDay(row.paymentDueDay);
  if (!isPastDueDay(new Date(), referenceMonth, dueDay)) return;
  // Em pausa (ex.: atestado médico): sem atraso.
  const pause = await loadOpenPause(supabase, studentId);
  if (pause && isPauseActiveOn(pause, todayYmdLisbon())) return;

  const now = new Date();
  if (
    row.paymentGraceReferenceMonth === referenceMonth &&
    row.paymentGraceEndsAt &&
    new Date(row.paymentGraceEndsAt) > now
  ) {
    return;
  }

  const endsAt = endOfGracePeriodLisbon(referenceMonth, dueDay);
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
    body: `A mensalidade (${referenceMonth}) está em atraso (prazo: dia ${dueDay}). Regulariza até ${deadlineLabel}, para evitar bloqueio de acesso.`,
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


/** Pagadores com pagamento automático ativo + membros dos respetivos grupos familiares. */
async function studentsWithActiveAutoPay(supabase: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await supabase.from("AutoPay").select("studentId, familyGroupId").eq("state", "ACTIVE");
  if (error) return new Set(); // tabela ainda inexistente (migração por aplicar): comportamento antigo
  const rows = (data ?? []) as { studentId: string; familyGroupId: string | null }[];
  const ids = new Set(rows.map((r) => r.studentId));
  const groupIds = rows.map((r) => r.familyGroupId).filter((g): g is string => !!g);
  if (groupIds.length) {
    const { data: members } = await supabase.from("FamilyGroupMember").select("studentId").in("familyGroupId", groupIds);
    for (const m of (members ?? []) as { studentId: string }[]) ids.add(m.studentId);
  }
  return ids;
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

  // Pagamento automático ativo: a mensalidade é cobrada no dia de cobrança do aluno (pode ser depois do prazo),
  // por isso não suspende o pagador nem os membros do grupo familiar dele.
  const autoPayExempt = await studentsWithActiveAutoPay(supabase);
  const list0 = ((rows ?? []) as {
    id: string;
    planId: string;
    stripeSubscriptionId: string | null;
    paymentGraceEndsAt: string;
  }[]).filter((r) => !autoPayExempt.has(r.id));
  // Em pausa (ex.: atestado médico): nunca suspende.
  const today = todayYmdLisbon();
  const pausesByStudent = await loadPausesByStudent(supabase, list0.map((r) => r.id));
  const list = list0.filter((r) => !(pausesByStudent.get(r.id) ?? []).some((p) => isPauseActiveOn(p, today)));

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

/**
 * Cron diário: começa a tolerância (e avisa o aluno) para mensalidades por pagar cujo
 * dia de pagamento do aluno já passou — a geração (dia 1) já não o faz antes do prazo.
 */
export async function startGraceForOverdueTuition(supabase: SupabaseClient): Promise<{ started: number }> {
  const now = new Date();
  const months = [previousReferenceMonthLisbon(now), currentReferenceMonthLisbon(now)];
  const { data } = await supabase
    .from("Payment")
    .select("studentId, referenceMonth")
    .eq("status", "LATE")
    .eq("paymentType", "TUITION")
    .in("referenceMonth", months);
  const latestByStudent = new Map<string, string>();
  for (const p of (data ?? []) as { studentId: string; referenceMonth: string }[]) {
    const cur = latestByStudent.get(p.studentId);
    if (!cur || p.referenceMonth < cur) latestByStudent.set(p.studentId, p.referenceMonth);
  }
  if (latestByStudent.size === 0) return { started: 0 };
  const ids = [...latestByStudent.keys()];
  const { data: rows } = await supabase
    .from("Student")
    .select("id, paymentGraceReferenceMonth, paymentGraceEndsAt, paymentDueDay")
    .in("id", ids)
    .not("planId", "is", null)
    .is("paymentSuspendedAt", null);
  let started = 0;
  for (const r of (rows ?? []) as { id: string; paymentGraceReferenceMonth: string | null; paymentGraceEndsAt: string | null; paymentDueDay: number | null }[]) {
    const month = latestByStudent.get(r.id)!;
    if (r.paymentGraceEndsAt) continue; // já em tolerância
    if (!isPastDueDay(now, month, normalizeDueDay(r.paymentDueDay))) continue;
    await startGracePeriodOnLatePayment(supabase, r.id, month);
    started++;
  }
  return { started };
}
