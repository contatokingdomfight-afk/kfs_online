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
