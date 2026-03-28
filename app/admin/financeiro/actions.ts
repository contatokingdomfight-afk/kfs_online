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
