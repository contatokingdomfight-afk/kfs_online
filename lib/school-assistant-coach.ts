import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type ActiveSchoolAssistant = {
  id: string;
  schoolId: string;
  studentId: string;
};

/** Treinador assistente activo (aluno com registo não revogado na sua escola). */
export async function getActiveSchoolAssistantForUserId(
  supabase: SupabaseClient,
  userId: string
): Promise<ActiveSchoolAssistant | null> {
  const { data: student } = await supabase.from("Student").select("id").eq("userId", userId).maybeSingle();
  if (!student?.id) return null;
  const { data: row } = await supabase
    .from("SchoolAssistantCoach")
    .select("id, schoolId, studentId")
    .eq("studentId", student.id)
    .is("revokedAt", null)
    .maybeSingle();
  if (!row?.id || !row.schoolId || !row.studentId) return null;
  return { id: row.id, schoolId: row.schoolId, studentId: row.studentId };
}

/** Rotas permitidas na shell coach para assistente (presenças e agenda da escola). */
export function isSchoolAssistantCoachPathAllowed(pathname: string): boolean {
  const path = (pathname.split("?")[0] ?? "").replace(/\/$/, "") || "/";
  if (path === "/coach") return true;
  if (path.startsWith("/coach/aula")) return true;
  if (path.startsWith("/coach/agenda")) return true;
  if (path.startsWith("/coach/eventos")) return true;
  if (path.startsWith("/coach/configuracoes")) return true;
  return false;
}
