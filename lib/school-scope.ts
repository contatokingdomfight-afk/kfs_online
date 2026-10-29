import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCachedSchools } from "@/lib/cached-reference-data";
import { AdminPermissionError } from "@/lib/permissions/assert";
import { canAccessSchool, schoolScopeFrom, type SchoolScope } from "@/lib/school-scope-rules";

export * from "@/lib/school-scope-rules";

/** Cookie com a escola escolhida no seletor do backoffice (vazio = todas, só Admin Geral). */
export const SELECTED_SCHOOL_COOKIE = "pm_school";

/** Escopo de escolas do utilizador atual (cache por pedido). Ver `SchoolScope`. */
export const getSchoolScope = cache(async function getSchoolScope(): Promise<SchoolScope> {
  const u = await getCurrentDbUser();
  if (!u || (u.role !== "ADMIN" && u.role !== "COACH")) return { kind: "none" };

  const admin = getAdminClientOrNull().client;
  // Sem service role não dá para ler as ligações: mantém o comportamento antigo (admin vê tudo).
  if (!admin) {
    return u.role === "ADMIN" ? { kind: "network", schools: [], selectedSchoolId: null } : { kind: "none" };
  }

  const [allSchools, cookieStore] = await Promise.all([getCachedSchools(admin), cookies()]);
  const wanted = cookieStore.get(SELECTED_SCHOOL_COOKIE)?.value || null;

  if (u.role === "ADMIN") {
    const { data: row } = await admin.from("User").select("isNetworkAdmin").eq("id", u.id).maybeSingle();
    if (row?.isNetworkAdmin) {
      const selectedSchoolId = wanted && allSchools.some((s) => s.id === wanted) ? wanted : null;
      return { kind: "network", schools: allSchools, selectedSchoolId };
    }
    const { data: links } = await admin.from("SchoolDirector").select("schoolId").eq("userId", u.id);
    return schoolScopeFrom((links ?? []).map((l) => l.schoolId as string), allSchools, wanted);
  }

  const { data: coach } = await admin.from("Coach").select("id").eq("userId", u.id).maybeSingle();
  if (!coach) return { kind: "none" };
  const { data: links } = await admin.from("CoachSchool").select("schoolId").eq("coachId", coach.id);
  return schoolScopeFrom((links ?? []).map((l) => l.schoolId as string), allSchools, wanted);
});

/** Server actions: falha se o registo for de uma escola fora do alcance do utilizador. */
export async function assertSchoolAccess(schoolId: string | null | undefined): Promise<void> {
  if (!canAccessSchool(await getSchoolScope(), schoolId)) throw new AdminPermissionError();
}

const NOT_YOUR_SCHOOL = "Não autorizado: este registo é de outra escola.";

/** Server actions que devolvem `{ error }`: erro se o aluno não for de uma escola do utilizador. */
export async function schoolAccessErrorForStudent(studentId: string | null | undefined): Promise<string | null> {
  const scope = await getSchoolScope();
  if (scope.kind === "network" || !studentId) return null;
  const admin = getAdminClientOrNull().client;
  if (!admin) return NOT_YOUR_SCHOOL;
  const { data } = await admin.from("Student").select("schoolId").eq("id", studentId).maybeSingle();
  return canAccessSchool(scope, data?.schoolId as string | undefined) ? null : NOT_YOUR_SCHOOL;
}

/** Igual, para linhas de uma tabela com coluna `schoolId` (pagamentos, despesas, receitas…). */
export async function schoolAccessErrorForRows(table: string, ids: string[]): Promise<string | null> {
  const scope = await getSchoolScope();
  if (scope.kind === "network" || ids.length === 0) return null;
  const admin = getAdminClientOrNull().client;
  if (!admin) return NOT_YOUR_SCHOOL;
  const { data } = await admin.from(table).select("schoolId").in("id", ids);
  const rows = (data ?? []) as { schoolId: string | null }[];
  return rows.every((r) => canAccessSchool(scope, r.schoolId)) ? null : NOT_YOUR_SCHOOL;
}

/**
 * Escola para um registo novo sem aluno (despesa, receita manual, depósito): a escola do seletor.
 * O Admin Geral em «Todas» com várias escolas tem de escolher uma primeiro.
 */
export async function schoolIdForNewRecord(): Promise<{ schoolId: string | null; error?: string }> {
  const scope = await getSchoolScope();
  if (scope.kind === "none") return { schoolId: null, error: "Não autorizado." };
  if (scope.selectedSchoolId) return { schoolId: scope.selectedSchoolId };
  if (scope.schools.length > 1) return { schoolId: null, error: "Escolhe a escola no seletor do topo antes de registar." };
  return { schoolId: scope.schools[0]?.id ?? null };
}
