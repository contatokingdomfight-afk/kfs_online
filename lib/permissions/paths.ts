import "server-only";

import type { AdminPermissionCode } from "@/lib/permissions/constants";
import { adminAccessAllows, type ResolvedAdminAccess } from "@/lib/permissions/resolve";

type Rule = { prefix: string; read: AdminPermissionCode; write: AdminPermissionCode };

/**
 * Prefixos (mais específico primeiro) → par read/write. Rotas fora disto usam a regra
 * "só Início" ou são tratadas no layout (ex. /admin exact).
 */
const ORDERED_PATH_RULES: readonly Rule[] = [
  { prefix: "/admin/componentes-gerais", read: "admin:sistema:read", write: "admin:sistema:write" },
  { prefix: "/admin/permissoes", read: "admin:sistema:read", write: "admin:sistema:write" },
  { prefix: "/admin/avaliacao", read: "admin:sistema:read", write: "admin:sistema:write" },
  { prefix: "/admin/desempenho-modalidades", read: "admin:alunos:read", write: "admin:alunos:write" },
  { prefix: "/admin/missoes", read: "admin:sistema:read", write: "admin:sistema:write" },
  { prefix: "/admin/metas", read: "admin:sistema:read", write: "admin:sistema:write" },
  { prefix: "/admin/eventos", read: "admin:sistema:read", write: "admin:sistema:write" },
  { prefix: "/admin/notificacoes", read: "admin:sistema:read", write: "admin:sistema:write" },
  { prefix: "/admin/configuracoes", read: "admin:sistema:read", write: "admin:sistema:write" },
  { prefix: "/admin/modalidades", read: "admin:sistema:read", write: "admin:sistema:write" },
  { prefix: "/admin/tema-semana", read: "admin:sistema:read", write: "admin:sistema:write" },
  { prefix: "/admin/locais", read: "admin:sistema:read", write: "admin:sistema:write" },
  { prefix: "/admin/dashboard", read: "admin:financeiro:read", write: "admin:financeiro:write" },
  { prefix: "/admin/financeiro", read: "admin:financeiro:read", write: "admin:financeiro:write" },
  { prefix: "/admin/loja", read: "admin:financeiro:read", write: "admin:financeiro:write" },
  { prefix: "/admin/experimentais", read: "admin:comercial:read", write: "admin:comercial:write" },
  { prefix: "/admin/leads", read: "admin:comercial:read", write: "admin:comercial:write" },
  { prefix: "/admin/escolas", read: "admin:escolas:read", write: "admin:escolas:write" },
  { prefix: "/admin/alunos", read: "admin:alunos:read", write: "admin:alunos:write" },
  { prefix: "/admin/familias", read: "admin:alunos:read", write: "admin:alunos:write" },
  { prefix: "/admin/atletas", read: "admin:alunos:read", write: "admin:alunos:write" },
  { prefix: "/admin/turmas", read: "admin:turmas:read", write: "admin:turmas:write" },
  { prefix: "/admin/planos", read: "admin:planos:read", write: "admin:planos:write" },
  { prefix: "/admin/cursos", read: "admin:cursos:read", write: "admin:cursos:write" },
  { prefix: "/admin/coaches", read: "admin:coaches:read", write: "admin:coaches:write" },
  /* Coach: cobre /coach/aula/qr, /coach/cursos/..., /coach/biblioteca/..., /coach/alunos/.../..., etc. */
  { prefix: "/coach/configuracoes", read: "admin:sistema:read", write: "admin:sistema:write" },
  { prefix: "/coach/cursos", read: "admin:cursos:read", write: "admin:cursos:write" },
  { prefix: "/coach/biblioteca", read: "admin:cursos:read", write: "admin:cursos:write" },
  { prefix: "/coach/financeiro", read: "admin:financeiro:read", write: "admin:financeiro:write" },
  { prefix: "/coach/experimentais", read: "admin:comercial:read", write: "admin:comercial:write" },
  { prefix: "/coach/tema-semana", read: "admin:sistema:read", write: "admin:sistema:write" },
  { prefix: "/coach/aula", read: "admin:turmas:read", write: "admin:turmas:write" },
  { prefix: "/coach/agenda", read: "admin:turmas:read", write: "admin:turmas:write" },
  { prefix: "/coach/presenca", read: "admin:turmas:read", write: "admin:turmas:write" },
  { prefix: "/coach/round-timer", read: "admin:turmas:read", write: "admin:turmas:write" },
  { prefix: "/coach/arbitragem", read: "admin:sistema:read", write: "admin:sistema:write" },
  { prefix: "/coach/eventos", read: "admin:sistema:read", write: "admin:sistema:write" },
  { prefix: "/coach/alunos", read: "admin:alunos:read", write: "admin:alunos:write" },
  { prefix: "/coach/desempenho-modalidades", read: "admin:alunos:read", write: "admin:alunos:write" },
  { prefix: "/coach/atletas", read: "admin:alunos:read", write: "admin:alunos:write" },
  { prefix: "/coach/notificacoes", read: "admin:sistema:read", write: "admin:sistema:write" },
  { prefix: "/como-sou-avaliado", read: "admin:sistema:read", write: "admin:sistema:write" },
  { prefix: "/sistema-pontuacao", read: "admin:sistema:read", write: "admin:sistema:write" },
];

function normalize(p: string): string {
  if (p.length > 1 && p.endsWith("/")) return p.replace(/\/+$/, "") || "/";
  return p;
}

function ruleForPathname(pathname: string): Rule | null {
  const p = normalize(pathname);
  for (const r of ORDERED_PATH_RULES) {
    if (p === r.prefix || p.startsWith(r.prefix + "/")) return r;
  }
  return null;
}

/**
 * Acesso a rotas de backoffice (admin) e de coach; a mesma matriz v1 de códigos.
 * `/dashboard` (ver como aluno) é sempre permitido para o fluxo do menu do coach.
 */
export function canAccessAdminPathname(
  access: ResolvedAdminAccess,
  pathname: string
): boolean {
  if (access.kind === "none") return false;
  if (access.kind === "all") return true;

  const p = normalize(pathname);
  if (p === "/dashboard" || p.startsWith("/dashboard/")) return true;

  /* Arbitragem: qualquer staff com permissões granulares activas */
  if (p === "/coach/arbitragem" || p.startsWith("/coach/arbitragem/")) {
    return access.codes.size > 0;
  }

  if (p === "/admin" || p === "/admin/") {
    return access.codes.size > 0;
  }
  if (p === "/coach" || p === "/coach/") {
    return access.codes.size > 0;
  }

  const rule = ruleForPathname(p);
  if (!rule) {
    if (p.startsWith("/admin") || p.startsWith("/coach")) {
      return false;
    }
    return false;
  }
  return adminAccessAllows(access, rule.read) || adminAccessAllows(access, rule.write);
}

export function isGranularRestrictedDashboard(access: ResolvedAdminAccess): boolean {
  return access.kind === "granted";
}
