"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureOnboardingPendingPayments } from "@/lib/ensure-onboarding-pending-payments";
import { planRequiresPrimaryModality } from "@/lib/plan-primary-modality";

export type SelectPlanPayAtSchoolResult = { error?: string };

/** Aluno escolhe plano; gera pagamentos pendentes para liquidar na secretaria. */
export async function selectPlanPayAtSchool(
  _prev: SelectPlanPayAtSchoolResult | null,
  formData: FormData
): Promise<SelectPlanPayAtSchoolResult> {
  const dbUser = await getCurrentDbUser();
  const studentId = await getCurrentStudentId();
  if (!dbUser || !studentId) return { error: "Não autenticado." };

  const planId = (formData.get("planId") as string)?.trim();
  const primaryModality = (formData.get("primaryModality") as string)?.trim() || null;

  if (!planId) return { error: "Plano inválido." };

  const supabase = createAdminClient();

  const { data: student } = await supabase
    .from("Student")
    .select("id, schoolId, planId")
    .eq("id", studentId)
    .single();

  if (!student) return { error: "Aluno não encontrado." };
  if ((student as { planId?: string | null }).planId) {
    return { error: "Já tens um plano ativo." };
  }

  const { data: plan } = await supabase
    .from("Plan")
    .select("id, name, schoolId, modalityScope")
    .eq("id", planId)
    .eq("isActive", true)
    .maybeSingle();

  if (!plan) return { error: "Plano indisponível." };

  const allowedSchools = new Set([student.schoolId, "default-school-001"]);
  if (!allowedSchools.has(plan.schoolId)) {
    return { error: "Este plano não está disponível para a tua escola." };
  }

  const scope = (plan as { modalityScope?: string | null }).modalityScope;
  const planName = (plan as { name?: string | null }).name;
  let effectiveModality: string | null = primaryModality;
  if (planRequiresPrimaryModality(scope, planId, planName)) {
    if (!effectiveModality) return { error: "Escolhe a modalidade incluída no plano." };
  } else {
    effectiveModality = null;
  }

  const { error: updateErr } = await supabase
    .from("Student")
    .update({
      planId,
      primaryModality: effectiveModality,
      adminGrantedFullAccess: false,
    })
    .eq("id", studentId);

  if (updateErr) return { error: updateErr.message };

  const pending = await ensureOnboardingPendingPayments(supabase, studentId, planId);
  if (pending.error) return { error: pending.error };

  revalidatePath("/escolher-plano");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/financeiro");
  revalidatePath("/admin/financeiro");
  revalidatePath("/admin/alunos");
  redirect("/dashboard/financeiro?pagamento_escola=1");
}
