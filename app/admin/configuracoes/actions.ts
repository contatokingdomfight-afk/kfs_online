"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";

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
