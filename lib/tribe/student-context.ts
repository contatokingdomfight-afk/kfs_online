import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import type { SupabaseClient } from "@supabase/supabase-js";

export type TribeStudentContext = {
  supabase: SupabaseClient;
  studentId: string;
  schoolId: string;
  userId: string;
};

/**
 * Contexto para mutações Tribo no servidor: aluno autenticado + escola + cliente admin (RLS nas tabelas Tribo).
 */
export async function getTribeStudentWriteContext(): Promise<
  { ok: true; ctx: TribeStudentContext } | { ok: false; error: "auth" | "role" | "admin" | "student" }
> {
  const admin = getAdminClientOrNull();
  if (!admin.client) return { ok: false, error: "admin" };

  const [dbUser, studentId] = await Promise.all([getCurrentDbUser(), getCurrentStudentId()]);
  if (!dbUser) return { ok: false, error: "auth" };
  if (dbUser.role !== "ALUNO") return { ok: false, error: "role" };
  if (!studentId) return { ok: false, error: "student" };

  const { data: st, error } = await admin.client.from("Student").select("id, schoolId, planId").eq("id", studentId).maybeSingle();
  if (error || !st?.schoolId) return { ok: false, error: "student" };
  if (!st.planId) return { ok: false, error: "student" };

  return {
    ok: true,
    ctx: {
      supabase: admin.client,
      studentId: st.id as string,
      schoolId: st.schoolId as string,
      userId: dbUser.id,
    },
  };
}

/** Leitura do feed com as mesmas regras de visibilidade (usa admin + filtro explícito). */
export function tribePostVisibleForSchool(row: { visibility: string; schoolId: string }, viewerSchoolId: string): boolean {
  if (row.visibility === "ALL_SCHOOLS") return true;
  return row.schoolId === viewerSchoolId;
}
