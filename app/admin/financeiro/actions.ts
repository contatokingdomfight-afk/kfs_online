"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRenewalsPending, generateMonthlyPayments, type GenerateMonthlyPaymentsResult } from "@/lib/renewals";

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
  const id = crypto.randomUUID();

  const { error } = await supabase.from("Payment").insert({
    id,
    studentId,
    amount,
    status,
    referenceMonth,
  });

  if (error) return { error: error.message };

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
  const result = await generateMonthlyPayments(supabase, referenceMonth);
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
