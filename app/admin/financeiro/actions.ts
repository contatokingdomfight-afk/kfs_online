"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadStudentPaymentRows, type StudentPaymentRow } from "@/lib/admin-student-payment-context";
import { searchStudentIdsByQuery } from "@/lib/admin-search-students";
import { getRenewalsPending, generateMonthlyPayments, type GenerateMonthlyPaymentsResult } from "@/lib/renewals";
import { clearGraceOnPaidPayment, startGracePeriodOnLatePayment } from "@/lib/payment-grace";
import { syncStudentPaymentStatus } from "@/lib/student-payment-status";
import { upsertTuitionPayment } from "@/lib/payment-tuition-upsert";
import { listConsecutiveReferenceMonths } from "@/lib/reference-month";
import { createFirstPaymentBundle } from "@/lib/first-payment-bundle";

export type { StudentPaymentRow };

export type SearchStudentsForPaymentResult = { error: string } | { results: StudentPaymentRow[] };

/** Pesquisa alunos por nome, email ou telefone (perfil) para registar pagamento. */
export async function searchStudentsForPayment(
  query: string,
  referenceMonth: string
): Promise<SearchStudentsForPaymentResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const q = query.trim();
  if (q.length < 2) {
    return { error: "Indica pelo menos 2 caracteres (nome, email ou telefone)." };
  }
  if (!/^\d{4}-\d{2}$/.test(referenceMonth)) {
    return { error: "Mês de referência inválido (use AAAA-MM)." };
  }

  const supabase = createAdminClient();

  const ids = await searchStudentIdsByQuery(supabase, q);
  const results = await loadStudentPaymentRows(supabase, ids, referenceMonth);
  results.sort((a, b) => (a.name || a.email || "").localeCompare(b.name || b.email || "", "pt"));

  return { results };
}

export type { GenerateMonthlyPaymentsResult };
export type CreatePaymentResult = { error?: string };

export async function createPayment(
  _prev: CreatePaymentResult | null,
  formData: FormData
): Promise<CreatePaymentResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const studentId = (formData.get("studentId") as string)?.trim();
  const amountStr = (formData.get("amount") as string)?.trim();
  const referenceMonth = (formData.get("referenceMonth") as string)?.trim();
  const status = formData.get("status") as string;

  if (!studentId) return { error: "Aluno é obrigatório." };
  const amount = parseFloat(amountStr ?? "");
  if (Number.isNaN(amount) || amount < 0) return { error: "Valor inválido." };
  if (!referenceMonth || !/^\d{4}-\d{2}$/.test(referenceMonth)) return { error: "Mês de referência deve ser AAAA-MM." };
  if (status !== "PAID" && status !== "LATE") return { error: "Status inválido." };

  const supabase = createAdminClient();

  const upsertResult = await upsertTuitionPayment(supabase, {
    studentId,
    referenceMonth,
    amount,
    status: status as "PAID" | "LATE",
  });
  if (upsertResult.error) return { error: upsertResult.error };

  if (status === "LATE") {
    await startGracePeriodOnLatePayment(supabase, studentId, referenceMonth);
  } else {
    await clearGraceOnPaidPayment(supabase, studentId);
  }

  await syncStudentPaymentStatus(supabase, studentId);

  revalidatePath("/admin/financeiro");
  revalidatePath("/admin/financeiro/novo");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/financeiro");
  redirect("/admin/financeiro");
}

/** Lista de renovações pendentes (alunos com plano sem pagamento no mês). */
export async function getRenewalsPendingAction(referenceMonth: string) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return [];
  const supabase = createAdminClient();
  return getRenewalsPending(supabase, referenceMonth);
}

/** Gera mensalidades do mês (Payment LATE) para todos os alunos com plano que ainda não têm pagamento. */
export async function generateMonthlyPaymentsAction(
  referenceMonth: string
): Promise<GenerateMonthlyPaymentsResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { created: 0, skipped: 0, error: "Não autorizado." };
  const supabase = createAdminClient();
  const result = await generateMonthlyPayments(supabase, referenceMonth, { force: true });
  revalidatePath("/admin/financeiro");
  return result;
}

/** Wrapper para formulário: lê referenceMonth do formData. */
export async function generateMonthlyPaymentsFormAction(
  _prev: GenerateMonthlyPaymentsResult | null,
  formData: FormData
): Promise<GenerateMonthlyPaymentsResult> {
  const referenceMonth = (formData.get("referenceMonth") as string)?.trim() ?? "";
  return generateMonthlyPaymentsAction(referenceMonth);
}

/**
 * Remove duplicados históricos: LATE quando já existe PAID no mesmo mês; vários PAID ou vários LATE
 * para o mesmo par aluno+mês (mantém o registo mais antigo por createdAt).
 */
export async function dedupeDuplicatePaymentsAction(): Promise<void> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");

  const supabase = createAdminClient();
  const { data: rows, error } = await supabase
    .from("Payment")
    .select("id, studentId, status, referenceMonth, createdAt")
    .eq("paymentType", "TUITION");

  if (error) redirect(`/admin/financeiro?dedupedError=${encodeURIComponent(error.message)}`);

  type Row = { id: string; studentId: string; status: string; referenceMonth: string; createdAt: string | null };
  const list = (rows ?? []) as Row[];
  const groupKey = (sid: string, rm: string) => `${sid}\t${rm}`;
  const groups = new Map<string, Row[]>();
  for (const r of list) {
    const k = groupKey(r.studentId, r.referenceMonth);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }

  let removed = 0;
  for (const [, g] of groups) {
    const paids = g.filter((r) => r.status === "PAID");
    const lates = g.filter((r) => r.status === "LATE");

    if (paids.length > 0 && lates.length > 0) {
      const ids = lates.map((r) => r.id);
      const { error: delErr } = await supabase.from("Payment").delete().in("id", ids);
      if (delErr) redirect(`/admin/financeiro?dedupedError=${encodeURIComponent(delErr.message)}`);
      removed += ids.length;
    }

    const paids2 = g.filter((r) => r.status === "PAID");
    if (paids2.length > 1) {
      const sorted = [...paids2].sort(
        (a, b) =>
          new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime() || a.id.localeCompare(b.id)
      );
      const toDel = sorted.slice(1).map((r) => r.id);
      const { error: delErr } = await supabase.from("Payment").delete().in("id", toDel);
      if (delErr) redirect(`/admin/financeiro?dedupedError=${encodeURIComponent(delErr.message)}`);
      removed += toDel.length;
    }

    const lates2 = g.filter((r) => r.status === "LATE");
    if (paids.length === 0 && lates2.length > 1) {
      const sorted = [...lates2].sort(
        (a, b) =>
          new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime() || a.id.localeCompare(b.id)
      );
      const toDel = sorted.slice(1).map((r) => r.id);
      const { error: delErr } = await supabase.from("Payment").delete().in("id", toDel);
      if (delErr) redirect(`/admin/financeiro?dedupedError=${encodeURIComponent(delErr.message)}`);
      removed += toDel.length;
    }
  }

  revalidatePath("/admin/financeiro");
  redirect(`/admin/financeiro?deduped=${removed}`);
}

export type ExpenseActionResult = { error?: string; success?: boolean };

function parseDateOnly(s: string): string | null {
  const t = s.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  return t;
}

export async function createFinancialExpense(
  _prev: ExpenseActionResult | null,
  formData: FormData
): Promise<ExpenseActionResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const amountStr = (formData.get("amount") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() ?? "";
  const occurredOn = parseDateOnly((formData.get("occurredOn") as string) ?? "");
  if (!description) return { error: "Descrição é obrigatória." };
  const amount = parseFloat(amountStr ?? "");
  if (Number.isNaN(amount) || amount <= 0) return { error: "Indica um valor positivo." };
  if (!occurredOn) return { error: "Data inválida (AAAA-MM-DD)." };
  const kindRaw = (formData.get("kind") as string)?.trim();
  const kind = kindRaw === "FIXED" || kindRaw === "VARIABLE" ? kindRaw : "VARIABLE";

  const supabase = createAdminClient();
  const id = crypto.randomUUID();
  const { error } = await supabase.from("FinancialExpense").insert({
    id,
    amount: amount.toFixed(2),
    description,
    occurredOn,
    kind,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/financeiro");
  return { success: true };
}

export async function deleteFinancialExpense(formData: FormData) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");
  const id = (formData.get("id") as string)?.trim();
  if (!id) return;
  const supabase = createAdminClient();
  const { error } = await supabase.from("FinancialExpense").delete().eq("id", id);
  if (error) {
    redirect(`/admin/financeiro?expenseError=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/admin/financeiro");
}

export type ManualRevenueActionResult = { error?: string; success?: boolean };

export async function createManualRevenue(
  _prev: ManualRevenueActionResult | null,
  formData: FormData
): Promise<ManualRevenueActionResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const amountStr = (formData.get("amount") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() ?? "";
  const occurredOn = parseDateOnly((formData.get("occurredOn") as string) ?? "");
  if (!description) return { error: "Descrição é obrigatória." };
  const amount = parseFloat(amountStr ?? "");
  if (Number.isNaN(amount) || amount <= 0) return { error: "Indica um valor positivo." };
  if (!occurredOn) return { error: "Data inválida (AAAA-MM-DD)." };

  const supabase = createAdminClient();
  const id = crypto.randomUUID();
  const { error } = await supabase.from("FinancialRevenue").insert({
    id,
    amount: amount.toFixed(2),
    description,
    occurredOn,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/financeiro");
  return { success: true };
}

export async function deleteManualRevenue(formData: FormData) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/dashboard");
  const id = (formData.get("id") as string)?.trim();
  if (!id) return;
  const supabase = createAdminClient();
  const { error } = await supabase.from("FinancialRevenue").delete().eq("id", id);
  if (error) {
    redirect(`/admin/financeiro?revenueError=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/admin/financeiro");
}

export type AdvanceTuitionPaymentsResult = { error?: string; success?: boolean; monthsPaid?: number };

/** Regista N meses consecutivos de mensalidade como PAID (pagamento antecipado). */
export async function createAdvanceTuitionPayments(
  _prev: AdvanceTuitionPaymentsResult | null,
  formData: FormData
): Promise<AdvanceTuitionPaymentsResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const studentId = (formData.get("studentId") as string)?.trim();
  const startMonth = (formData.get("startMonth") as string)?.trim();
  const monthsStr = (formData.get("months") as string)?.trim();
  const amountStr = (formData.get("amountPerMonth") as string)?.trim();

  if (!studentId) return { error: "Aluno é obrigatório." };
  if (!startMonth || !/^\d{4}-\d{2}$/.test(startMonth)) return { error: "Mês inicial inválido (AAAA-MM)." };
  const months = parseInt(monthsStr ?? "", 10);
  if (Number.isNaN(months) || months < 1 || months > 12) return { error: "Número de meses deve ser entre 1 e 12." };
  const amountPerMonth = parseFloat(amountStr ?? "");
  if (Number.isNaN(amountPerMonth) || amountPerMonth < 0) return { error: "Valor por mês inválido." };

  const supabase = createAdminClient();
  const monthList = listConsecutiveReferenceMonths(startMonth, months);

  for (const referenceMonth of monthList) {
    const result = await upsertTuitionPayment(supabase, {
      studentId,
      referenceMonth,
      amount: amountPerMonth,
      status: "PAID",
    });
    if (result.error) {
      return { error: `${referenceMonth}: ${result.error}` };
    }
  }

  await clearGraceOnPaidPayment(supabase, studentId);
  await syncStudentPaymentStatus(supabase, studentId);

  revalidatePath("/admin/financeiro");
  revalidatePath("/admin/financeiro/antecipado");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/financeiro");
  return { success: true, monthsPaid: months };
}

export type CreateFirstPaymentResult = { error?: string };

/** Primeiro pagamento do aluno: mensalidade + matrícula (opcional) + seguro (obrigatório). */
export async function createFirstPayment(
  _prev: CreateFirstPaymentResult | null,
  formData: FormData
): Promise<CreateFirstPaymentResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const studentId = (formData.get("studentId") as string)?.trim();
  const referenceMonth = (formData.get("referenceMonth") as string)?.trim();
  const tuitionStr = (formData.get("tuitionAmount") as string)?.trim();
  const referenceYear = (formData.get("referenceYear") as string)?.trim() || new Date().getFullYear().toString();
  const includeEnrollment = formData.get("includeEnrollment") === "on";
  const includeInsurance = formData.get("includeInsurance") === "on";

  if (!studentId) return { error: "Aluno é obrigatório." };
  const tuitionAmount = parseFloat(tuitionStr ?? "");
  if (Number.isNaN(tuitionAmount) || tuitionAmount < 0) return { error: "Valor da mensalidade inválido." };

  const supabase = createAdminClient();
  const result = await createFirstPaymentBundle(supabase, {
    studentId,
    referenceMonth,
    tuitionAmount,
    includeEnrollment,
    includeInsurance,
    referenceYear,
    adminUserId: dbUser.id,
  });
  if (result.error) return { error: result.error };

  await clearGraceOnPaidPayment(supabase, studentId);
  await syncStudentPaymentStatus(supabase, studentId);

  revalidatePath("/admin/financeiro");
  revalidatePath("/admin/financeiro/primeiro-pagamento");
  revalidatePath("/admin/financeiro/novo");
  revalidatePath(`/admin/alunos/${studentId}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/financeiro");
  revalidatePath("/escolher-plano");
  redirect("/admin/financeiro");
}
