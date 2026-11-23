import "server-only";

import { adminPermissionError } from "@/lib/permissions/assert";
import type { AdminPermissionCode } from "@/lib/permissions/constants";
import { getSchoolScope, isNetworkScope } from "@/lib/school-scope";

/**
 * Configuração que vale para toda a rede (modalidades, critérios de avaliação, cursos, configurações gerais):
 * além da permissão, só o Admin Geral pode alterar. O diretor tem as mesmas permissões de admin,
 * mas estas áreas não são da escola dele.
 */
export async function networkAdminPermissionError(code: AdminPermissionCode): Promise<string | null> {
  const permErr = await adminPermissionError(code);
  if (permErr) return permErr;
  return isNetworkScope(await getSchoolScope()) ? null : "Só o Admin Geral pode alterar isto (vale para toda a rede).";
}
