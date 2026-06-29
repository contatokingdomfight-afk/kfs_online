"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadStudentPaymentRows, type StudentPaymentRow } from "@/lib/admin-student-payment-context";
import { searchStudentIdsByQuery } from "@/lib/admin-search-students";
import { getRenewalsPending, generateMonthlyPayments, type GenerateMonthlyPaymentsResult } from "@/lib/renewals";
import { clearGraceOnPaidPayment, startGracePeriodOnLatePayment } from "@/lib/payment-grace";

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

  const { data: existingRows, error: existingErr } = await supabase
    .from("Payment")
    .select("id, status")
    .eq("studentId", studentId)
    .eq("referenceMonth", referenceMonth);

  if (existingErr) return { error: existingErr.message };

  const rows = existingRows ?? [];

  if (status === "PAID") {
    const keepId =
      rows.find((r) => (r as { status: string }).status === "PAID")?.id ??
      rows.find((r) => (r as { status: string }).status === "LATE")?.id;

    if (rows.length === 0) {
      const id = crypto.randomUUID();
      const { error } = await supabase.from("Payment").insert({
        id,
        studentId,
        amount,
        status: "PAID",
        referenceMonth,
      });
      if (error) return { error: error.message };
    } else if (keepId) {
      const toDelete = rows.map((r) => (r as { id: string }).id).filter((id) => id !== keepId);
      if (toDelete.length > 0) {
        const { error: delErr } = await supabase.from("Payment").delete().in("id", toDelete);
        if (delErr) return { error: delErr.message };
      }
      const { error: upErr } = await supabase
        .from("Payment")
        .update({ amount, status: "PAID" })
        .eq("id", keepId);
      if (upErr) return { error: upErr.message };
    }
  } else {
    // LATE
    if (rows.some((r) => (r as { status: string }).status === "PAID")) {
      return { error: "Já existe pagamento pago para este mês. Remove ou altera o registo existente." };
    }
    if (rows.length === 0) {
      const id = crypto.randomUUID();
      const { error } = await supabase.from("Payment").insert({
        id,
        studentId,
        amount,
        status: "LATE",
        referenceMonth,
      });
      if (error) return { error: error.message };
    } else {
      const keepId = rows[0].id as string;
      const toDelete = rows.slice(1).map((r) => (r as { id: string }).id);
      if (toDelete.length > 0) {
        const { error: delErr } = await supabase.from("Payment").delete().in("id", toDelete);
        if (delErr) return { error: delErr.message };
      }
      const { error: upErr } = await supabase.from("Payment").update({ amount, status: "LATE" }).eq("id", keepId);
      if (upErr) return { error: upErr.message };
    }
  }

  if (status === "LATE") {
    await startGracePeriodOnLatePayment(supabase, studentId, referenceMonth);
  } else {
    await clearGraceOnPaidPayment(supabase, studentId);
  }

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
    .select("id, studentId, status, referenceMonth, createdAt");

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
