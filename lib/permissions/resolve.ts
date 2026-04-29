import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { ALL_ADMIN_PERMISSION_SET, ALL_ADMIN_PERMISSION_CODES, type AdminPermissionCode } from "@/lib/permissions/constants";

export type ResolvedAdminAccess =
  | { kind: "none" }
  | { kind: "all" }
  | { kind: "granted"; codes: Set<AdminPermissionCode> };

/**
 * Resolve o conjunto efectivo de permissões para `User.id` (ADMIN ou COACH, staff).
 * - Não-ADMIN/COACH: `none`
 * - Staff sem granular: `all` (comportamento por defeito; admins e coaches existentes)
 * - Com granular: `granted` (códigos em `UserAdminPermission`)
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
  if (row.role !== "ADMIN" && row.role !== "COACH") return { kind: "none" };
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

/**
 * `granted` com as 18 permissões v1 — efeito equivalente ao acesso "completo" para o painel inicial
 * (receita, gráficos, grelha); o menu continua a ser o mesmo que com `kind: all` se o filtro permitir tudo.
 */
export function hasAllV1AdminPermissions(access: ResolvedAdminAccess): boolean {
  if (access.kind !== "granted") return false;
  for (const c of ALL_ADMIN_PERMISSION_CODES) {
    if (!access.codes.has(c)) return false;
  }
  return true;
}
