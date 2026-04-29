/**
 * Códigos v1 (imutáveis) — tabela `AdminPermission` e ecrã `/admin/permissoes`.
 * Aplicável quando `User.adminUseGranularPermissions` é true (role = ADMIN).
 */

export const ALL_ADMIN_PERMISSION_CODES = [
  "admin:alunos:read",
  "admin:alunos:write",
  "admin:turmas:read",
  "admin:turmas:write",
  "admin:planos:read",
  "admin:planos:write",
  "admin:financeiro:read",
  "admin:financeiro:write",
  "admin:escolas:read",
  "admin:escolas:write",
  "admin:coaches:read",
  "admin:coaches:write",
  "admin:cursos:read",
  "admin:cursos:write",
  "admin:comercial:read",
  "admin:comercial:write",
  "admin:sistema:read",
  "admin:sistema:write",
] as const;

export type AdminPermissionCode = (typeof ALL_ADMIN_PERMISSION_CODES)[number];

export const ALL_ADMIN_PERMISSION_SET = new Set<string>(ALL_ADMIN_PERMISSION_CODES);
