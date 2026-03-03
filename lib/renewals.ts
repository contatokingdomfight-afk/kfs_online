/**
 * Renovação automática de planos: alunos com plano e mensalidades por mês.
 * - Listar alunos com plano que ainda não têm pagamento no mês de referência.
 * - Gerar registos de Payment (mensalidades) para o mês com status LATE.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type RenewalPending = {
  studentId: string;
  studentName: string;
  studentEmail: string;
  planId: string;
  planName: string;
  priceMonthly: number;
};

/**
 * Devolve alunos que têm plano atribuído e não têm nenhum pagamento
 * para o mês de referência (YYYY-MM).
 */
export async function getRenewalsPending(
  supabase: SupabaseClient,
  referenceMonth: string
): Promise<RenewalPending[]> {
  if (!/^\d{4}-\d{2}$/.test(referenceMonth)) return [];

  const { data: students } = await supabase
    .from("Student")
    .select("id, userId, planId")
    .not("planId", "is", null);

  if (!students?.length) return [];

  const planIds = [...new Set(students.map((s) => s.planId).filter(Boolean))] as string[];
  const { data: plans } = await supabase
    .from("Plan")
    .select("id, name, price_monthly")
    .in("id", planIds)
    .eq("is_active", true);

  const planById = new Map((plans ?? []).map((p) => [p.id, p]));

  const { data: payments } = await supabase
    .from("Payment")
    .select("studentId")
    .eq("referenceMonth", referenceMonth);

  const paidStudentIds = new Set((payments ?? []).map((p) => p.studentId));

  const withPlan = students.filter(
    (s) => s.planId && planById.has(s.planId) && !paidStudentIds.has(s.id)
  );
  if (withPlan.length === 0) return [];

  const userIds = [...new Set(withPlan.map((s) => s.userId))];
  const { data: users } = await supabase.from("User").select("id, name, email").in("id", userIds);
  const userById = new Map((users ?? []).map((u) => [u.id, u]));

  return withPlan.map((s) => {
    const plan = planById.get(s.planId)!;
    const user = userById.get(s.userId);
    return {
      studentId: s.id,
      studentName: user?.name ?? user?.email ?? "—",
      studentEmail: user?.email ?? "",
      planId: plan.id,
      planName: plan.name,
      priceMonthly: Number(plan.price_monthly ?? 0),
    };
  });
}

export type GenerateMonthlyPaymentsResult = {
  created: number;
  skipped: number;
  error?: string;
};

/**
 * Cria um registo de Payment (status LATE) para cada aluno com plano
 * que ainda não tem pagamento no mês de referência. Valor = plan.price_monthly.
 */
export async function generateMonthlyPayments(
  supabase: SupabaseClient,
  referenceMonth: string
): Promise<GenerateMonthlyPaymentsResult> {
  if (!/^\d{4}-\d{2}$/.test(referenceMonth)) {
    return { created: 0, skipped: 0, error: "Mês de referência deve ser AAAA-MM." };
  }

  const pending = await getRenewalsPending(supabase, referenceMonth);
  let created = 0;

  for (const p of pending) {
    const { error } = await supabase.from("Payment").insert({
      studentId: p.studentId,
      amount: p.priceMonthly,
      status: "LATE",
      referenceMonth,
    });
    if (error) {
      return { created, skipped: pending.length - created, error: error.message };
    }
    created++;
  }

  return { created, skipped: pending.length - created };
}
