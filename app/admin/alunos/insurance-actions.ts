"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { renewStudentInsuranceCoverage } from "@/lib/renew-student-insurance-coverage";

export type InsuranceActionResult = { error?: string; success?: boolean };

function parseYmd(s: string): string | null {
  const t = s.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
}

function revalidateStudentCoachPaths(studentId: string) {
  revalidatePath(`/admin/alunos/${studentId}`);
  revalidatePath("/admin/alunos");
  revalidatePath(`/coach/alunos/${studentId}`);
  revalidatePath(`/coach/alunos/${studentId}/inscricao`);
}

/** Renova cobertura anual (+1 ano a partir de hoje ou após fim anterior). */
export async function renewStudentInsurance(
  _prev: InsuranceActionResult | null,
  formData: FormData
): Promise<InsuranceActionResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const studentId = (formData.get("studentId") as string)?.trim();
  if (!studentId) return { error: "Aluno inválido." };

  const supabase = createAdminClient();
  const renew = await renewStudentInsuranceCoverage(supabase, studentId, dbUser.id);
  if (renew.error) return { error: renew.error };

  revalidateStudentCoachPaths(studentId);
  return { success: true };
}

/** Regista pagamento anual de seguro (Payment INSURANCE). */
export async function registerInsurancePayment(
  _prev: InsuranceActionResult | null,
  formData: FormData
): Promise<InsuranceActionResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const studentId = (formData.get("studentId") as string)?.trim();
  const amountStr = (formData.get("amount") as string)?.trim();
  const referenceYear = (formData.get("referenceYear") as string)?.trim();

  if (!studentId) return { error: "Aluno inválido." };
  const amount = parseFloat(amountStr ?? "");
  if (Number.isNaN(amount) || amount < 0) return { error: "Valor inválido." };
  if (!referenceYear || !/^\d{4}$/.test(referenceYear)) return { error: "Ano inválido (AAAA)." };

  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("Payment")
    .select("id")
    .eq("studentId", studentId)
    .eq("paymentType", "INSURANCE")
    .eq("referenceYear", referenceYear)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("Payment")
      .update({ amount: amount.toFixed(2), status: "PAID" })
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("Payment").insert({
      id: crypto.randomUUID(),
      studentId,
      amount: amount.toFixed(2),
      status: "PAID",
      paymentType: "INSURANCE",
      referenceYear,
      referenceMonth: null,
    });
    if (error) return { error: error.message };
  }

  revalidateStudentCoachPaths(studentId);
  revalidatePath("/admin/financeiro");
  return { success: true };
}

/** Actualiza datas/notas de cobertura manualmente. */
export async function updateStudentInsuranceCoverage(
  _prev: InsuranceActionResult | null,
  formData: FormData
): Promise<InsuranceActionResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const studentId = (formData.get("studentId") as string)?.trim();
  const covered = formData.get("covered") === "on" || formData.get("covered") === "true";
  const startDate = parseYmd((formData.get("coverageStartDate") as string) ?? "");
  const endDate = parseYmd((formData.get("coverageEndDate") as string) ?? "");
  const policyReference = (formData.get("policyReference") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!studentId) return { error: "Aluno inválido." };
  if (covered && (!startDate || !endDate)) return { error: "Indica datas de início e fim." };
  if (startDate && endDate && endDate < startDate) return { error: "Data de fim deve ser posterior ao início." };

  const supabase = createAdminClient();
  const row = {
    studentId,
    covered,
    coverageStartDate: startDate,
    coverageEndDate: endDate,
    policyReference,
    notes,
    updatedAt: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from("StudentInsuranceCoverage")
    .select("id")
    .eq("studentId", studentId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("StudentInsuranceCoverage").update(row).eq("studentId", studentId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("StudentInsuranceCoverage").insert({ id: crypto.randomUUID(), ...row });
    if (error) return { error: error.message };
  }

  revalidateStudentCoachPaths(studentId);
  return { success: true };
}

/** Marca aluno sem cobertura activa. */
export async function clearStudentInsuranceCoverage(
  _prev: InsuranceActionResult | null,
  formData: FormData
): Promise<InsuranceActionResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const studentId = (formData.get("studentId") as string)?.trim();
  if (!studentId) return { error: "Aluno inválido." };

  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("StudentInsuranceCoverage")
    .select("id")
    .eq("studentId", studentId)
    .maybeSingle();

  const row = {
    studentId,
    covered: false,
    updatedAt: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await supabase.from("StudentInsuranceCoverage").update(row).eq("studentId", studentId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("StudentInsuranceCoverage").insert({ id: crypto.randomUUID(), ...row });
    if (error) return { error: error.message };
  }

  revalidateStudentCoachPaths(studentId);
  return { success: true };
}
