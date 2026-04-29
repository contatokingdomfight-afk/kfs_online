import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { ALL_ADMIN_PERMISSION_SET, type AdminPermissionCode } from "@/lib/permissions/constants";

export type ResolvedAdminAccess =
  | { kind: "none" }
  | { kind: "all" }
  | { kind: "granted"; codes: Set<AdminPermissionCode> };

/**
 * Resolve o conjunto efectivo de permissões para um `User.id` (role ADMIN).
 * - Não-ADMIN: `none`
 * - ADMIN sem granular: `all` (compatível com admins existentes)
 * - ADMIN com granular: `granted` (apenas códigos na tabela `UserAdminPermission`)
 */
export async function resolveAdminPermissionsForUserId(
  supabase: SupabaseClient,
  userId: string
): Promise<ResolvedAdminAccess> {
  const { data: row, error } = await supabase
    .from("User")
    .select("id, role, adminUseGranularPermissions")
    .eq("id", userId)
    .maybeSingle();
  if (error || !row) return { kind: "none" };
  if (row.role !== "ADMIN") return { kind: "none" };
  if (!row.adminUseGranularPermissions) {
    return { kind: "all" };
  }
  const { data: grants, error: gErr } = await supabase
    .from("UserAdminPermission")
    .select("permissionCode")
    .eq("userId", userId);
  if (gErr || !grants) return { kind: "granted", codes: new Set() };
  const codes = new Set<AdminPermissionCode>();
  for (const g of grants) {
    const c = (g as { permissionCode: string }).permissionCode;
    if (ALL_ADMIN_PERMISSION_SET.has(c)) codes.add(c as AdminPermissionCode);
  }
  return { kind: "granted", codes };
}

export function adminAccessAllows(
  access: ResolvedAdminAccess,
  code: AdminPermissionCode
): boolean {
  if (access.kind === "none") return false;
  if (access.kind === "all") return true;
  return access.codes.has(code);
}
