/**
 * Sincroniza Student.status com a situação de pagamento:
 * - ATIVO: em dia (sem LATE, com plano ou acesso concedido)
 * - INADIMPLENTE: 1 mês em atraso ou acesso suspenso por falta de pagamento
 * - INATIVO: 2+ meses com Payment LATE
 * EXPERIMENTAL não é alterado automaticamente.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type AutoStudentStatus = "ATIVO" | "INADIMPLENTE" | "INATIVO";

type StudentRow = {
  id: string;
  status: string;
  planId: string | null;
  suspendedPlanId?: string | null;
  paymentSuspendedAt?: string | null;
  adminGrantedFullAccess?: boolean | null;
};

/** Deriva o status a partir de pagamentos e plano (sem escrever na BD). */
export function deriveStudentStatusFromPayments(input: {
  lateMonthCount: number;
  paymentSuspendedAt: string | null;
  planId: string | null;
  adminGrantedFullAccess: boolean;
  inPaymentProgram: boolean;
}): AutoStudentStatus | null {
  const { lateMonthCount, paymentSuspendedAt, planId, adminGrantedFullAccess, inPaymentProgram } = input;
  if (!inPaymentProgram) return null;

  if (lateMonthCount >= 2) return "INATIVO";
  if (lateMonthCount >= 1 || paymentSuspendedAt) return "INADIMPLENTE";
  if (planId || adminGrantedFullAccess) return "ATIVO";
  return "INADIMPLENTE";
}

async function loadLateMonthCount(supabase: SupabaseClient, studentId: string): Promise<number> {
  const { data: latePayments } = await supabase
    .from("Payment")
    .select("referenceMonth")
    .eq("studentId", studentId)
    .eq("status", "LATE");
  return new Set((latePayments ?? []).map((p) => String((p as { referenceMonth: string }).referenceMonth))).size;
}

async function studentInPaymentProgram(supabase: SupabaseClient, studentId: string): Promise<boolean> {
  const { count } = await supabase
    .from("Payment")
    .select("id", { count: "exact", head: true })
    .eq("studentId", studentId);
  return (count ?? 0) > 0;
}

/** Atualiza Student.status para um aluno com base nos pagamentos. */
export async function syncStudentPaymentStatus(
  supabase: SupabaseClient,
  studentId: string
): Promise<{ updated: boolean; status: string | null }> {
  const { data: st } = await supabase
    .from("Student")
    .select("id, status, planId, suspendedPlanId, paymentSuspendedAt, adminGrantedFullAccess")
    .eq("id", studentId)
    .maybeSingle();

  const row = st as StudentRow | null;
  if (!row) return { updated: false, status: null };
  if (row.status === "EXPERIMENTAL") return { updated: false, status: row.status };

  const hadPlan =
    Boolean(row.planId) ||
    Boolean(row.suspendedPlanId) ||
    Boolean(row.paymentSuspendedAt) ||
    row.adminGrantedFullAccess === true;
  const inProgram = hadPlan || (await studentInPaymentProgram(supabase, studentId));
  if (!inProgram) return { updated: false, status: row.status };

  const lateMonthCount = await loadLateMonthCount(supabase, studentId);
  const next = deriveStudentStatusFromPayments({
    lateMonthCount,
    paymentSuspendedAt: row.paymentSuspendedAt ?? null,
    planId: row.planId,
    adminGrantedFullAccess: row.adminGrantedFullAccess === true,
    inPaymentProgram: true,
  });

  if (!next || next === row.status) return { updated: false, status: row.status };

  const { error } = await supabase.from("Student").update({ status: next }).eq("id", studentId);
  if (error) {
    console.error(`syncStudentPaymentStatus(${studentId}):`, error.message);
    return { updated: false, status: row.status };
  }
  return { updated: true, status: next };
}

/** Sincroniza todos os alunos com plano ou histórico de pagamento (cron / manutenção). */
export async function syncAllStudentPaymentStatuses(
  supabase: SupabaseClient
): Promise<{ synced: number; updated: number; errors: string[] }> {
  const { data: withPlan } = await supabase.from("Student").select("id").not("planId", "is", null);
  const { data: suspended } = await supabase
    .from("Student")
    .select("id")
    .is("planId", null)
    .not("paymentSuspendedAt", "is", null);
  const { data: withPayments } = await supabase.from("Payment").select("studentId");

  const ids = new Set<string>([
    ...(withPlan ?? []).map((s) => s.id),
    ...(suspended ?? []).map((s) => s.id),
    ...(withPayments ?? []).map((p) => (p as { studentId: string }).studentId),
  ]);

  let synced = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const id of ids) {
    synced++;
    const result = await syncStudentPaymentStatus(supabase, id);
    if (result.updated) updated++;
  }

  return { synced, updated, errors };
}
