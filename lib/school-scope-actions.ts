"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getSchoolScope, SELECTED_SCHOOL_COOKIE, canAccessSchool } from "@/lib/school-scope";

/** Seletor de escola do backoffice: guarda a escolha (vazio = todas, só Admin Geral). */
export async function setSelectedSchool(schoolId: string): Promise<{ error?: string }> {
  const scope = await getSchoolScope();
  const store = await cookies();
  if (!schoolId) {
    if (scope.kind !== "network") return { error: "Não autorizado." };
    store.delete(SELECTED_SCHOOL_COOKIE);
  } else {
    if (!canAccessSchool(scope, schoolId)) return { error: "Não autorizado." };
    store.set(SELECTED_SCHOOL_COOKIE, schoolId, { path: "/", httpOnly: true, sameSite: "lax", secure: true, maxAge: 60 * 60 * 24 * 365 });
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/coach", "layout");
  return {};
}
