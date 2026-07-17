"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePublicPlans } from "@/lib/public-plans";

const MODALITY_SCOPES = ["NONE", "SINGLE", "ALL"] as const;

export type PlanFormResult = { error?: string };

export async function createPlan(
  _prev: PlanFormResult | null,
  formData: FormData
): Promise<PlanFormResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const priceStr = (formData.get("price_monthly") as string)?.trim();
  const schoolId = (formData.get("schoolId") as string)?.trim();
  const includesDigital = formData.get("includes_digital_access") === "on" || formData.get("includes_digital_access") === "true";
  const modalityScope = (formData.get("modality_scope") as string)?.trim() || "SINGLE";
  const isActive = formData.get("is_active") !== "off" && formData.get("is_active") !== "false";
  const stripePriceId = (formData.get("stripePriceId") as string)?.trim() || null;
  const includesPerformance = formData.get("includes_performance_tracking") === "on" || formData.get("includes_performance_tracking") === "true";
  const includesCheckIn = formData.get("includes_check_in") === "on" || formData.get("includes_check_in") === "true";
  const maxCheckInsStr = (formData.get("max_check_ins_per_day") as string)?.trim();
  const maxCheckInsPerDay = maxCheckInsStr === "" || maxCheckInsStr === "unlimited" ? null : parseInt(maxCheckInsStr, 10);
  const includesExclusiveBenefits = formData.get("includes_exclusive_benefits") === "on" || formData.get("includes_exclusive_benefits") === "true";

  if (!name) return { error: "Nome do plano é obrigatório." };
  if (!schoolId) return { error: "Escola é obrigatória." };
  const price = priceStr ? parseFloat(priceStr) : 0;
  if (isNaN(price) || price < 0) return { error: "Preço mensal deve ser um número ≥ 0." };
  if (!MODALITY_SCOPES.includes(modalityScope as (typeof MODALITY_SCOPES)[number])) {
    return { error: "Âmbito de modalidade inválido." };
  }

  const supabase = createAdminClient();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const { error } = await supabase.from("Plan").insert({
    id,
    name,
    description,
    priceMonthly: price,
    schoolId,
    includesDigitalAccess: includesDigital,
    modalityScope,
    isActive,
    stripePriceId,
    includes_performance_tracking: includesPerformance,
    includes_check_in: includesCheckIn,
    max_check_ins_per_day: maxCheckInsPerDay,
    includes_exclusive_benefits: includesExclusiveBenefits,
    createdAt: now,
    updatedAt: now,
  });

  if (error) {
    console.error("createPlan error:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/planos");
  revalidatePublicPlans();
  redirect("/admin/planos");
}

export async function updatePlan(
  _prev: PlanFormResult | null,
  formData: FormData
): Promise<PlanFormResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const planId = (formData.get("planId") as string)?.trim();
  if (!planId) return { error: "ID do plano inválido." };

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const priceStr = (formData.get("price_monthly") as string)?.trim();
  const includesDigital = formData.get("includes_digital_access") === "on" || formData.get("includes_digital_access") === "true";
  const modalityScope = (formData.get("modality_scope") as string)?.trim() || "SINGLE";
  const isActive = formData.get("is_active") !== "off" && formData.get("is_active") !== "false";
  const stripePriceId = (formData.get("stripePriceId") as string)?.trim() || null;
  const includesPerformance = formData.get("includes_performance_tracking") === "on" || formData.get("includes_performance_tracking") === "true";
  const includesCheckIn = formData.get("includes_check_in") === "on" || formData.get("includes_check_in") === "true";
  const maxCheckInsStr = (formData.get("max_check_ins_per_day") as string)?.trim();
  const maxCheckInsPerDay = maxCheckInsStr === "" || maxCheckInsStr === "unlimited" ? null : parseInt(maxCheckInsStr, 10);
  const includesExclusiveBenefits = formData.get("includes_exclusive_benefits") === "on" || formData.get("includes_exclusive_benefits") === "true";

  if (!name) return { error: "Nome do plano é obrigatório." };
  const price = priceStr ? parseFloat(priceStr) : 0;
  if (isNaN(price) || price < 0) return { error: "Preço mensal deve ser um número ≥ 0." };
  if (!MODALITY_SCOPES.includes(modalityScope as (typeof MODALITY_SCOPES)[number])) {
    return { error: "Âmbito de modalidade inválido." };
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("Plan")
    .update({
      name,
      description,
      priceMonthly: price,
      includesDigitalAccess: includesDigital,
      modalityScope,
      isActive,
      stripePriceId,
      includes_performance_tracking: includesPerformance,
      includes_check_in: includesCheckIn,
      max_check_ins_per_day: maxCheckInsPerDay,
      includes_exclusive_benefits: includesExclusiveBenefits,
    })
    .eq("id", planId);

  if (error) return { error: error.message };

  revalidatePath("/admin/planos");
  revalidatePath(`/admin/planos/${planId}`);
  revalidatePublicPlans();
  return {};
}

export type UpdatePlanPriceResult = { error?: string; success?: boolean };

/** Atualiza o Stripe Price ID de uma opção PlanPrice (para corrigir Teste vs Produção). */
export async function updatePlanPrice(
  _prev: UpdatePlanPriceResult | null,
  formData: FormData
): Promise<UpdatePlanPriceResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const planPriceId = (formData.get("planPriceId") as string)?.trim();
  const stripePriceId = (formData.get("stripePriceId") as string)?.trim();
  if (!planPriceId || !stripePriceId) return { error: "ID e Stripe Price ID são obrigatórios." };
  if (!stripePriceId.startsWith("price_")) return { error: "Stripe Price ID deve começar por price_" };

  const supabase = createAdminClient();
  const { data: planPrice } = await supabase
    .from("PlanPrice")
    .select("planId, sortOrder")
    .eq("id", planPriceId)
    .single();

  const { error } = await supabase
    .from("PlanPrice")
    .update({ stripePriceId })
    .eq("id", planPriceId);

  if (error) return { error: error.message };

  // Se for o preço mensal (sortOrder=1), atualiza também Plan.stripePriceId
  if (planPrice?.planId && planPrice.sortOrder === 1) {
    await supabase.from("Plan").update({ stripePriceId }).eq("id", planPrice.planId);
  }

  revalidatePath("/admin/planos");
  revalidatePath("/escolher-plano");
  revalidatePath("/dashboard/financeiro");
  revalidatePublicPlans();
  return { success: true };
}
