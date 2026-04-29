"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { ALL_ADMIN_PERMISSION_SET } from "@/lib/permissions/constants";
import { adminAccessAllows, resolveAdminPermissionsForUserId } from "@/lib/permissions/resolve";

export type UpdateUserAdminPermsResult = { error?: string; success?: boolean };

function parseSelectedCodes(formData: FormData): string[] {
  const raw = formData.get("codes");
  if (!raw || typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((c) => c.trim())
    .filter((c) => ALL_ADMIN_PERMISSION_SET.has(c));
}

export async function updateUserAdminPermissions(
  _prev: UpdateUserAdminPermsResult | null,
  formData: FormData
): Promise<UpdateUserAdminPermsResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") {
    return { error: "Não autorizado." };
  }

  const targetId = (formData.get("userId") as string)?.trim();
  if (!targetId) return { error: "Utilizador inválido." };

  const granular = formData.get("adminUseGranular") === "true";
  const codes = parseSelectedCodes(formData);

  const supabase = createAdminClient();
  const access = await resolveAdminPermissionsForUserId(supabase, dbUser.id);
  if (access.kind === "granted" && !adminAccessAllows(access, "admin:sistema:write")) {
    return { error: "Não autorizado a alterar permissões (necessária permissão de sistema — escrita)." };
  }

  const { data: target, error: tErr } = await supabase
    .from("User")
    .select("id, role")
    .eq("id", targetId)
    .single();
  if (tErr || !target) return { error: "Utilizador não encontrado." };
  if (target.role !== "ADMIN") {
    return { error: "Permissões detalhadas aplicam-se apenas a contas com função de administrador." };
  }

  if (granular && codes.length === 0) {
    return { error: "Com permissões detalhadas activas, escolhe pelo menos um item." };
  }

  const lockErr = await assertAtLeastOneFullAdminAfter(supabase, targetId, granular);
  if (lockErr) return { error: lockErr };

  const { error: uErr } = await supabase
    .from("User")
    .update({ adminUseGranularPermissions: granular } as { adminUseGranularPermissions: boolean })
    .eq("id", targetId);
  if (uErr) return { error: uErr.message };

  await supabase.from("UserAdminPermission").delete().eq("userId", targetId);

  if (granular && codes.length > 0) {
    const rows = codes.map((code) => ({
      userId: targetId,
      permissionCode: code,
    }));
    const { error: iErr } = await supabase.from("UserAdminPermission").insert(rows);
    if (iErr) return { error: iErr.message };
  }

  revalidatePath("/admin/permissoes");
  revalidatePath(`/admin/permissoes/${targetId}`);
  return { success: true };
}

type AdminSupa = ReturnType<typeof createAdminClient>;

/**
 * Garante que, após guardar, existe pelo menos um ADMIN com acesso completo
 * (`adminUseGranularPermissions` = false).
 */
async function assertAtLeastOneFullAdminAfter(
  supabase: AdminSupa,
  targetId: string,
  newGranular: boolean
): Promise<string | null> {
  const { data: admins, error } = await supabase
    .from("User")
    .select("id, adminUseGranularPermissions")
    .eq("role", "ADMIN");
  if (error || !admins?.length) return null;
  const after = admins.map((a) => {
    const u = a as { id: string; adminUseGranularPermissions: boolean | null };
    if (u.id === targetId) return { ...u, adminUseGranularPermissions: newGranular };
    return u;
  });
  const full = after.filter((a) => !(a as { adminUseGranularPermissions: boolean | null }).adminUseGranularPermissions);
  if (full.length === 0) {
    return "É necessário manter pelo menos um administrador com acesso completo (sem permissões detalhadas).";
  }
  return null;
}

export type AdminPermissionRow = {
  code: string;
  module: string;
  labelPt: string;
  labelEn: string;
  sortOrder: number;
};

export async function fetchAdminPermissionCatalog(): Promise<AdminPermissionRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("AdminPermission")
    .select("code, module, labelPt, labelEn, sortOrder")
    .order("sortOrder", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminPermissionRow[];
}
