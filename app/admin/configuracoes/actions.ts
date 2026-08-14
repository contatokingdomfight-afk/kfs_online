"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncPendingInsuranceAmounts } from "@/lib/sync-pending-insurance-amount";

export type UpdateAttendanceGoalResult = { error?: string; success?: boolean };

export async function updateAttendanceGoal(
  _prev: UpdateAttendanceGoalResult | null,
  formData: FormData
): Promise<UpdateAttendanceGoalResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const valueStr = (formData.get("target_value") as string)?.trim();
  const value = valueStr ? parseInt(valueStr, 10) : 10;
  if (isNaN(value) || value < 1 || value > 99) return { error: "Meta deve ser entre 1 e 99 aulas." };

  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("AttendanceGoal")
    .select("id")
    .eq("is_global", true)
    .limit(1)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("AttendanceGoal")
      .update({ target_value: value })
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("AttendanceGoal").insert({
      target_value: value,
      period_type: "MONTHLY",
      is_global: true,
    });
    if (error) return { error: error.message };
  }

  revalidatePath("/admin/configuracoes");
  revalidatePath("/dashboard");
  return { success: true };
}

export type UpdateInsuranceSettingsResult = { error?: string; success?: boolean };

export async function updateInsuranceSettings(
  _prev: UpdateInsuranceSettingsResult | null,
  formData: FormData
): Promise<UpdateInsuranceSettingsResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const amountStr = (formData.get("annualAmount") as string)?.trim();
  const enrollmentStr = (formData.get("enrollmentAmount") as string)?.trim();
  const policyReference = (formData.get("policyReference") as string)?.trim() || null;
  const amount = parseFloat(amountStr ?? "");
  const enrollmentAmount = parseFloat(enrollmentStr ?? "0");
  if (Number.isNaN(amount) || amount < 0) return { error: "Valor do seguro inválido." };
  if (Number.isNaN(enrollmentAmount) || enrollmentAmount < 0) return { error: "Valor da matrícula inválido." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("InsuranceSettings").upsert({
    id: "global",
    annualAmount: amount.toFixed(2),
    enrollmentAmount: enrollmentAmount.toFixed(2),
    policyReference,
    updatedAt: new Date().toISOString(),
  });
  if (error) return { error: error.message };

  await syncPendingInsuranceAmounts(supabase);

  revalidatePath("/admin/configuracoes");
  revalidatePath("/admin/alunos");
  revalidatePath("/admin/financeiro");
  return { success: true };
}
