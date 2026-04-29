import "server-only";

import { cache } from "react";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { resolveAdminPermissionsForUserId, type ResolvedAdminAccess } from "@/lib/permissions/resolve";

/**
 * Cache por pedido: permissões efectivas do admin no servidor (service role se disponível).
 */
export const getCachedResolvedAdminAccess = cache(async function getCachedResolvedAdminAccess(): Promise<ResolvedAdminAccess> {
  const u = await getCurrentDbUser();
  if (!u || u.role !== "ADMIN") return { kind: "none" };
  const admin = getAdminClientOrNull();
  if (!admin.client) return { kind: "all" };
  return resolveAdminPermissionsForUserId(admin.client, u.id);
});
