import "server-only";

import { getCachedResolvedAdminAccess } from "@/lib/permissions/get-cached-resolved";
import { adminAccessAllows, type ResolvedAdminAccess } from "@/lib/permissions/resolve";
import type { AdminPermissionCode } from "@/lib/permissions/constants";

export class AdminPermissionError extends Error {
  constructor(message = "Não autorizado.") {
    super(message);
    this.name = "AdminPermissionError";
  }
}

/** Valida permissão v1 no servidor (UI + layouts não bastam). */
export async function assertAdminPermission(code: AdminPermissionCode): Promise<ResolvedAdminAccess> {
  const access = await getCachedResolvedAdminAccess();
  if (access.kind === "none") throw new AdminPermissionError();
  if (!adminAccessAllows(access, code)) throw new AdminPermissionError();
  return access;
}

export async function hasAdminPermission(code: AdminPermissionCode): Promise<boolean> {
  try {
    await assertAdminPermission(code);
    return true;
  } catch {
    return false;
  }
}

/** Para server actions que devolvem `{ error?: string }`. */
export async function adminPermissionError(code: AdminPermissionCode): Promise<string | null> {
  try {
    await assertAdminPermission(code);
    return null;
  } catch {
    return "Não autorizado.";
  }
}
