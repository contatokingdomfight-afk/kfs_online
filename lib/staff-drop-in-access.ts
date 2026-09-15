import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentCoachId } from "@/lib/auth/get-current-coach";
import { coachTeachesAtSchool } from "@/lib/coach-schools";

type DbUser = { role: string; id: string };

export function canStaffManageDropInSessions(dbUser: DbUser | null | undefined): boolean {
  return dbUser?.role === "ADMIN" || dbUser?.role === "COACH";
}

/** Admin: sempre. Coach: só se leciona na escola do aluno. */
export async function assertStaffCanManageStudentDropIn(
  supabase: SupabaseClient,
  dbUser: DbUser,
  studentId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!canStaffManageDropInSessions(dbUser)) {
    return { ok: false, error: "Não autorizado." };
  }
  if (dbUser.role === "ADMIN") return { ok: true };

  const coachId = await getCurrentCoachId();
  if (!coachId) return { ok: false, error: "Não autorizado." };

  const { data: student } = await supabase.from("Student").select("schoolId").eq("id", studentId).maybeSingle();
  if (!student?.schoolId) return { ok: false, error: "Aluno não encontrado." };

  const teaches = await coachTeachesAtSchool(supabase, coachId, student.schoolId);
  if (!teaches) return { ok: false, error: "Sem permissão para este aluno." };

  return { ok: true };
}
