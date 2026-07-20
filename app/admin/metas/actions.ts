"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  deriveGoalStatusAfterProgress,
  parseGoalMetricInput,
  recalculateCurrentValueFromEntries,
  toNumber,
  validateGoalDates,
  type AdminBusinessGoalRow,
  type AdminGoalEntryRow,
  type AdminGoalMetricType,
  type AdminGoalStatus,
  type AdminGoalWithSchool,
} from "@/lib/admin-business-goals";

export type GoalActionResult = { error?: string; success?: boolean };

async function assertAdmin() {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return null;
  return dbUser;
}

function parseSchoolId(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim();
  if (!v || v === "global") return null;
  return v;
}

function parseMetricType(raw: string | null | undefined): AdminGoalMetricType | null {
  if (raw === "QUANTITY" || raw === "MONETARY") return raw;
  return null;
}

function parseStatusFilter(raw: string | null | undefined): AdminGoalStatus | "ALL" | "OVERDUE" {
  if (raw === "ACTIVE" || raw === "COMPLETED" || raw === "CANCELLED" || raw === "OVERDUE") return raw;
  return "ALL";
}

export async function listAdminGoals(filters?: {
  schoolId?: string | null;
  status?: string | null;
}): Promise<AdminGoalWithSchool[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("AdminBusinessGoal")
    .select(
      "id, title, description, metricType, targetValue, currentValue, startDate, targetEndDate, schoolId, status, createdByUserId, createdAt, updatedAt"
    )
    .order("targetEndDate", { ascending: true });

  const schoolFilter = filters?.schoolId;
  if (schoolFilter === "global") {
    query = query.is("schoolId", null);
  } else if (schoolFilter) {
    query = query.eq("schoolId", schoolFilter);
  }

  const statusFilter = parseStatusFilter(filters?.status);
  if (statusFilter === "ACTIVE" || statusFilter === "COMPLETED" || statusFilter === "CANCELLED") {
    query = query.eq("status", statusFilter);
  }

  const { data: goals, error } = await query;
  if (error || !goals?.length) return [];

  const schoolIds = [...new Set(goals.map((g) => (g as AdminBusinessGoalRow).schoolId).filter(Boolean))] as string[];
  const { data: schools } = schoolIds.length
    ? await supabase.from("School").select("id, name").in("id", schoolIds)
    : { data: [] as { id: string; name: string }[] };
  const schoolById = new Map((schools ?? []).map((s) => [s.id, s.name]));

  let items: AdminGoalWithSchool[] = (goals as AdminBusinessGoalRow[]).map((g) => ({
    ...g,
    targetValue: toNumber(g.targetValue),
    currentValue: toNumber(g.currentValue),
    schoolName: g.schoolId ? schoolById.get(g.schoolId) ?? null : null,
  }));

  if (statusFilter === "OVERDUE") {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    const todayStr = `${y}-${m}-${d}`;
    items = items.filter((g) => g.status === "ACTIVE" && g.targetEndDate.slice(0, 10) < todayStr);
  }

  return items;
}

export async function getAdminGoalDetail(goalId: string): Promise<{
  goal: AdminGoalWithSchool | null;
  entries: (AdminGoalEntryRow & { authorName: string })[];
}> {
  const supabase = createAdminClient();
  const { data: goal } = await supabase
    .from("AdminBusinessGoal")
    .select(
      "id, title, description, metricType, targetValue, currentValue, startDate, targetEndDate, schoolId, status, createdByUserId, createdAt, updatedAt"
    )
    .eq("id", goalId)
    .maybeSingle();

  if (!goal) return { goal: null, entries: [] };

  const row = goal as AdminBusinessGoalRow;
  let schoolName: string | null = null;
  if (row.schoolId) {
    const { data: school } = await supabase.from("School").select("name").eq("id", row.schoolId).maybeSingle();
    schoolName = school?.name ?? null;
  }

  const { data: entryRows } = await supabase
    .from("AdminGoalEntry")
    .select("id, goalId, deltaValue, note, recordedAt, createdByUserId, createdAt")
    .eq("goalId", goalId)
    .order("recordedAt", { ascending: false })
    .order("createdAt", { ascending: false });

  const userIds = [...new Set((entryRows ?? []).map((e) => (e as AdminGoalEntryRow).createdByUserId))];
  const { data: users } = userIds.length
    ? await supabase.from("User").select("id, name, email").in("id", userIds)
    : { data: [] as { id: string; name: string | null; email: string | null }[] };
  const userById = new Map((users ?? []).map((u) => [u.id, u.name ?? u.email ?? "—"]));

  return {
    goal: {
      ...row,
      targetValue: toNumber(row.targetValue),
      currentValue: toNumber(row.currentValue),
      schoolName,
    },
    entries: (entryRows ?? []).map((e) => {
      const entry = e as AdminGoalEntryRow;
      return {
        ...entry,
        deltaValue: toNumber(entry.deltaValue),
        authorName: userById.get(entry.createdByUserId) ?? "—",
      };
    }),
  };
}

async function syncGoalCurrentValue(supabase: ReturnType<typeof createAdminClient>, goalId: string) {
  const { data: goal } = await supabase
    .from("AdminBusinessGoal")
    .select("targetValue, status")
    .eq("id", goalId)
    .maybeSingle();
  if (!goal) return;

  const { data: entries } = await supabase
    .from("AdminGoalEntry")
    .select("deltaValue")
    .eq("goalId", goalId);

  const currentValue = recalculateCurrentValueFromEntries((entries ?? []) as { deltaValue: number }[]);
  const targetValue = toNumber((goal as { targetValue: number }).targetValue);
  const status = deriveGoalStatusAfterProgress(
    currentValue,
    targetValue,
    (goal as { status: AdminGoalStatus }).status
  );

  await supabase
    .from("AdminBusinessGoal")
    .update({ currentValue, status, updatedAt: new Date().toISOString() })
    .eq("id", goalId);
}

export async function createGoal(_prev: GoalActionResult | null, formData: FormData): Promise<GoalActionResult> {
  const dbUser = await assertAdmin();
  if (!dbUser) return { error: "Não autorizado." };

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const metricType = parseMetricType(formData.get("metricType") as string);
  const targetRaw = formData.get("targetValue") as string;
  const startDate = (formData.get("startDate") as string)?.trim();
  const targetEndDate = (formData.get("targetEndDate") as string)?.trim();
  const schoolId = parseSchoolId(formData.get("schoolId") as string);

  if (!title) return { error: "Título é obrigatório." };
  if (!metricType) return { error: "Tipo de meta inválido." };

  const targetValue = parseGoalMetricInput(targetRaw, metricType);
  if (targetValue == null || targetValue <= 0) return { error: "Valor alvo deve ser maior que zero." };

  const dateErr = validateGoalDates(startDate, targetEndDate);
  if (dateErr) return { error: dateErr };

  const supabase = createAdminClient();
  const id = crypto.randomUUID();
  const { error } = await supabase.from("AdminBusinessGoal").insert({
    id,
    title,
    description,
    metricType,
    targetValue,
    currentValue: 0,
    startDate,
    targetEndDate,
    schoolId,
    status: "ACTIVE",
    createdByUserId: dbUser.id,
    updatedAt: new Date().toISOString(),
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/metas");
  redirect(`/admin/metas/${id}`);
}

export async function updateGoal(_prev: GoalActionResult | null, formData: FormData): Promise<GoalActionResult> {
  const dbUser = await assertAdmin();
  if (!dbUser) return { error: "Não autorizado." };

  const goalId = (formData.get("goalId") as string)?.trim();
  if (!goalId) return { error: "Meta inválida." };

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const metricType = parseMetricType(formData.get("metricType") as string);
  const targetRaw = formData.get("targetValue") as string;
  const startDate = (formData.get("startDate") as string)?.trim();
  const targetEndDate = (formData.get("targetEndDate") as string)?.trim();
  const schoolId = parseSchoolId(formData.get("schoolId") as string);

  if (!title) return { error: "Título é obrigatório." };
  if (!metricType) return { error: "Tipo de meta inválido." };

  const targetValue = parseGoalMetricInput(targetRaw, metricType);
  if (targetValue == null || targetValue <= 0) return { error: "Valor alvo deve ser maior que zero." };

  const dateErr = validateGoalDates(startDate, targetEndDate);
  if (dateErr) return { error: dateErr };

  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("AdminBusinessGoal")
    .select("currentValue, status")
    .eq("id", goalId)
    .maybeSingle();
  if (!existing) return { error: "Meta não encontrada." };

  const currentValue = toNumber((existing as { currentValue: number }).currentValue);
  const status = deriveGoalStatusAfterProgress(
    currentValue,
    targetValue,
    (existing as { status: AdminGoalStatus }).status
  );

  const { error } = await supabase
    .from("AdminBusinessGoal")
    .update({
      title,
      description,
      metricType,
      targetValue,
      startDate,
      targetEndDate,
      schoolId,
      status,
      updatedAt: new Date().toISOString(),
    })
    .eq("id", goalId);

  if (error) return { error: error.message };

  revalidatePath("/admin/metas");
  revalidatePath(`/admin/metas/${goalId}`);
  return { success: true };
}

export async function cancelGoal(_prev: GoalActionResult | null, formData: FormData): Promise<GoalActionResult> {
  const dbUser = await assertAdmin();
  if (!dbUser) return { error: "Não autorizado." };

  const goalId = (formData.get("goalId") as string)?.trim();
  if (!goalId) return { error: "Meta inválida." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("AdminBusinessGoal")
    .update({ status: "CANCELLED", updatedAt: new Date().toISOString() })
    .eq("id", goalId);

  if (error) return { error: error.message };

  revalidatePath("/admin/metas");
  revalidatePath(`/admin/metas/${goalId}`);
  return { success: true };
}

export async function completeGoal(_prev: GoalActionResult | null, formData: FormData): Promise<GoalActionResult> {
  const dbUser = await assertAdmin();
  if (!dbUser) return { error: "Não autorizado." };

  const goalId = (formData.get("goalId") as string)?.trim();
  if (!goalId) return { error: "Meta inválida." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("AdminBusinessGoal")
    .update({ status: "COMPLETED", updatedAt: new Date().toISOString() })
    .eq("id", goalId);

  if (error) return { error: error.message };

  revalidatePath("/admin/metas");
  revalidatePath(`/admin/metas/${goalId}`);
  return { success: true };
}

export async function addGoalEntry(_prev: GoalActionResult | null, formData: FormData): Promise<GoalActionResult> {
  const dbUser = await assertAdmin();
  if (!dbUser) return { error: "Não autorizado." };

  const goalId = (formData.get("goalId") as string)?.trim();
  const deltaRaw = formData.get("deltaValue") as string;
  const note = (formData.get("note") as string)?.trim() || null;
  const recordedAt = (formData.get("recordedAt") as string)?.trim();

  if (!goalId) return { error: "Meta inválida." };
  if (!recordedAt) return { error: "Data do lançamento é obrigatória." };

  const supabase = createAdminClient();
  const { data: goal } = await supabase
    .from("AdminBusinessGoal")
    .select("metricType, status")
    .eq("id", goalId)
    .maybeSingle();

  if (!goal) return { error: "Meta não encontrada." };
  if ((goal as { status: AdminGoalStatus }).status === "CANCELLED") {
    return { error: "Não é possível lançar numa meta cancelada." };
  }

  const metricType = (goal as { metricType: AdminGoalMetricType }).metricType;
  const deltaValue = parseGoalMetricInput(deltaRaw, metricType);
  if (deltaValue == null || deltaValue === 0) return { error: "Indica um valor de lançamento válido (diferente de zero)." };

  const { error } = await supabase.from("AdminGoalEntry").insert({
    id: crypto.randomUUID(),
    goalId,
    deltaValue,
    note,
    recordedAt,
    createdByUserId: dbUser.id,
  });

  if (error) return { error: error.message };

  await syncGoalCurrentValue(supabase, goalId);

  revalidatePath("/admin/metas");
  revalidatePath(`/admin/metas/${goalId}`);
  return { success: true };
}

export async function deleteGoalEntry(_prev: GoalActionResult | null, formData: FormData): Promise<GoalActionResult> {
  const dbUser = await assertAdmin();
  if (!dbUser) return { error: "Não autorizado." };

  const entryId = (formData.get("entryId") as string)?.trim();
  const goalId = (formData.get("goalId") as string)?.trim();
  if (!entryId || !goalId) return { error: "Lançamento inválido." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("AdminGoalEntry").delete().eq("id", entryId);
  if (error) return { error: error.message };

  await syncGoalCurrentValue(supabase, goalId);

  revalidatePath("/admin/metas");
  revalidatePath(`/admin/metas/${goalId}`);
  return { success: true };
}
