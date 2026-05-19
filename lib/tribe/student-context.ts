import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getEffectiveDashboardStudentId } from "@/lib/auth/effective-dashboard-student-id";
import { getViewAsFromCookies } from "@/lib/view-as-server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type TribeStudentContext = {
  supabase: SupabaseClient;
  studentId: string;
  schoolId: string;
  userId: string;
};

export type TribeGateError =
  | { ok: false; error: "admin"; adminDetail: "missing" | "wrong_key" }
  | { ok: false; error: "auth" | "role" | "student" | "missing_school" | "no_plan_student" | "admin_view_no_profile" };

/**
 * Contexto para mutações Tribo no servidor: aluno autenticado + escola + cliente admin (RLS nas tabelas Tribo).
 * Admin em «Ver como aluno» usa o mesmo Student do utilizador (ou o ligado em Coach) para pré-visualizar a Tribo.
 */
export async function getTribeStudentWriteContext(): Promise<{ ok: true; ctx: TribeStudentContext } | TribeGateError> {
  const admin = getAdminClientOrNull();
  if (!admin.client) {
    return { ok: false, error: "admin", adminDetail: admin.error };
  }

  const [dbUser, viewAs, studentId] = await Promise.all([getCurrentDbUser(), getViewAsFromCookies(), getEffectiveDashboardStudentId()]);
  if (!dbUser) return { ok: false, error: "auth" };

  const adminViewAsAluno = dbUser.role === "ADMIN" && viewAs === "aluno";
  if (dbUser.role !== "ALUNO" && !adminViewAsAluno) {
    return { ok: false, error: "role" };
  }
  if (!studentId) {
    return { ok: false, error: adminViewAsAluno ? "admin_view_no_profile" : "student" };
  }

  const { data: st, error } = await admin.client
    .from("Student")
    .select("id, schoolId, planId, userId")
    .eq("id", studentId)
    .maybeSingle();
  if (error || !st) return { ok: false, error: "student" };
  if (st.userId !== dbUser.id) return { ok: false, error: "student" };
  if (!st.planId) return { ok: false, error: "no_plan_student" };
  const schoolId = typeof st.schoolId === "string" ? st.schoolId.trim() : "";
  if (!schoolId) return { ok: false, error: "missing_school" };

  return {
    ok: true,
    ctx: {
      supabase: admin.client,
      studentId: st.id as string,
      schoolId,
      userId: dbUser.id,
    },
  };
}

/** Leitura do feed com as mesmas regras de visibilidade (usa admin + filtro explícito). */
export function tribePostVisibleForSchool(row: { visibility: string; schoolId: string }, viewerSchoolId: string): boolean {
  if (row.visibility === "ALL_SCHOOLS") return true;
  return row.schoolId === viewerSchoolId;
}
