import type { CachedSchoolOption } from "@/lib/cached-reference-data";

/**
 * A que escolas o utilizador de backoffice tem acesso (multi-escola, ver DOCS/mockup-multi-escola.html).
 * - `network`: Admin Geral (`User.isNetworkAdmin`) — todas as escolas; `selectedSchoolId` null = «Todas».
 * - `school`: Diretor Técnico (`SchoolDirector`) ou coach (`CoachSchool`) — só `schoolIds`.
 * - `none`: sem escola atribuída (ou não é staff).
 * Regras puras (testáveis); a leitura da BD/cookie está em `lib/school-scope.ts`.
 */
export type SchoolScope =
  | { kind: "none" }
  | { kind: "network"; schools: CachedSchoolOption[]; selectedSchoolId: string | null }
  | { kind: "school"; schools: CachedSchoolOption[]; schoolIds: string[]; selectedSchoolId: string };

/** Escopo de diretor/coach a partir das escolas ligadas; só conta escolas ativas. */
export function schoolScopeFrom(ids: string[], allSchools: CachedSchoolOption[], wanted: string | null): SchoolScope {
  const schools = allSchools.filter((s) => ids.includes(s.id));
  if (schools.length === 0) return { kind: "none" };
  const schoolIds = schools.map((s) => s.id);
  const selectedSchoolId = wanted && schoolIds.includes(wanted) ? wanted : schoolIds[0];
  return { kind: "school", schools, schoolIds, selectedSchoolId };
}

export function isNetworkScope(scope: SchoolScope): scope is Extract<SchoolScope, { kind: "network" }> {
  return scope.kind === "network";
}

/**
 * Escolas a filtrar nas consultas: `null` = sem filtro (Admin Geral em «Todas»); `[]` = nada.
 * Usar com `.in("schoolId", ids)` quando não for null — ver `scopeQuery`.
 */
export function scopedSchoolIds(scope: SchoolScope): string[] | null {
  if (scope.kind === "none") return [];
  return scope.selectedSchoolId ? [scope.selectedSchoolId] : null;
}

/**
 * Escola pedida por `?school=` (filtros antigos das páginas), limitada ao que o utilizador pode ver.
 * Sem parâmetro, usa a escola do seletor. Devolve null só para o Admin Geral em «Todas».
 */
export function resolveSchoolParam(scope: SchoolScope, param: string | null | undefined): string | null {
  const wanted = param?.trim() || null;
  if (scope.kind === "none") return null;
  if (scope.kind === "network") {
    if (wanted && (scope.schools.length === 0 || scope.schools.some((s) => s.id === wanted))) return wanted;
    return scope.selectedSchoolId;
  }
  return wanted && scope.schoolIds.includes(wanted) ? wanted : scope.selectedSchoolId;
}

export function canAccessSchool(scope: SchoolScope, schoolId: string | null | undefined): boolean {
  if (scope.kind === "network") return true;
  if (scope.kind === "none" || !schoolId) return false;
  return scope.schoolIds.includes(schoolId);
}

/** Aplica o filtro de escola a uma consulta Supabase (`column` = coluna com o id da escola). */
export function scopeQuery<Q extends { in: (column: string, values: string[]) => Q }>(
  query: Q,
  scope: SchoolScope,
  column = "schoolId"
): Q {
  const ids = scopedSchoolIds(scope);
  return ids === null ? query : query.in(column, ids);
}
