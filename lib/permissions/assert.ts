import "server-only";

import { cache } from "react";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getActiveSchoolAssistantForUserId } from "@/lib/school-assistant-coach";
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

/**
 * Cache por pedido: é o utilizador actual um "treinador assistente" activo (aluno com
 * `SchoolAssistantCoach` não revogado)? Ver `lib/school-assistant-coach.ts` e `app/coach/layout.tsx`.
 */
const isActiveSchoolAssistant = cache(async function isActiveSchoolAssistant(): Promise<boolean> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ALUNO") return false;
  const admin = getAdminClientOrNull();
  if (!admin.client) return false;
  const assistant = await getActiveSchoolAssistantForUserId(admin.client, dbUser.id);
  return Boolean(assistant);
});

/**
 * Igual a `assertAdminPermission`, mas deixa passar também um treinador assistente activo —
 * usar só nas server actions de `/coach/aula`, `/coach/agenda`, `/coach/eventos`,
 * `/coach/arbitragem` e `/coach/configuracoes` (as únicas rotas que
 * `isSchoolAssistantCoachPathAllowed` liberta para assistentes). Um assistente é `role: "ALUNO"`
 * na BD, por isso `assertAdminPermission` sozinho devolveria sempre `none` para ele.
 */
export async function assertAdminPermissionOrSchoolAssistant(
  code: AdminPermissionCode
): Promise<ResolvedAdminAccess | null> {
  if (await isActiveSchoolAssistant()) return null;
  return assertAdminPermission(code);
}

/** Para server actions que devolvem `{ error?: string }`, nas rotas acessíveis a assistentes. */
export async function adminPermissionErrorOrSchoolAssistant(code: AdminPermissionCode): Promise<string | null> {
  if (await isActiveSchoolAssistant()) return null;
  return adminPermissionError(code);
}
