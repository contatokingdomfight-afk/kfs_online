"use server";

import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";

export type ViewerRow = { studentId: string; name: string; email: string; completedAt: string | null };

async function resolveViewers(
  rows: { student_id: string; completed_at: string | null }[]
): Promise<ViewerRow[]> {
  if (rows.length === 0) return [];
  const supabase = createAdminClient();
  const studentIds = rows.map((r) => r.student_id);
  const completedAtByStudent = new Map(rows.map((r) => [r.student_id, r.completed_at]));

  const { data: students } = await supabase.from("Student").select("id, userId").in("id", studentIds);
  const userIds = [...new Set((students ?? []).map((s) => s.userId))];
  const { data: users } = await supabase.from("User").select("id, name, email").in("id", userIds);
  const userById = new Map((users ?? []).map((u) => [u.id, u]));
  const studentToUser = new Map((students ?? []).map((s) => [s.id, userById.get(s.userId)]));

  return studentIds
    .map((id) => {
      const u = studentToUser.get(id);
      return {
        studentId: id,
        name: u?.name ?? "—",
        email: u?.email ?? "",
        completedAt: completedAtByStudent.get(id) ?? null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "pt"));
}

async function assertAdmin(): Promise<string | null> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return "Não autorizado.";
  return null;
}

/** Alunos que concluíram uma unidade (aula) específica. */
export async function getUnitViewers(unitId: string): Promise<{ viewers: ViewerRow[]; error?: string }> {
  const authError = await assertAdmin();
  if (authError) return { viewers: [], error: authError };

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("CourseUnitProgress")
    .select("student_id, completed_at")
    .eq("unit_id", unitId);
  if (error) return { viewers: [], error: error.message };
  return { viewers: await resolveViewers(data ?? []) };
}

/** Alunos que concluíram o curso inteiro (todas as aulas). */
export async function getCourseCompleters(courseId: string): Promise<{ viewers: ViewerRow[]; error?: string }> {
  const authError = await assertAdmin();
  if (authError) return { viewers: [], error: authError };

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("CourseCompletion")
    .select("student_id, completed_at")
    .eq("course_id", courseId);
  if (error) return { viewers: [], error: error.message };
  return { viewers: await resolveViewers(data ?? []) };
}
