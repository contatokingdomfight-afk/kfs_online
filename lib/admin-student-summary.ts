import type { SupabaseClient } from "@supabase/supabase-js";

export type StudentSummaryRow = {
  studentId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  planName: string | null;
};

export async function loadStudentSummaryRows(
  supabase: SupabaseClient,
  studentIds: string[]
): Promise<StudentSummaryRow[]> {
  if (studentIds.length === 0) return [];

  const { data: students } = await supabase
    .from("Student")
    .select("id, userId, planId")
    .in("id", studentIds);

  if (!students?.length) return [];

  const userIds = [...new Set(students.map((s) => s.userId))];
  const planIds = [...new Set(students.map((s) => s.planId).filter(Boolean))] as string[];

  const [{ data: users }, { data: profiles }, { data: plans }] = await Promise.all([
    supabase.from("User").select("id, name, email").in("id", userIds),
    supabase.from("StudentProfile").select("studentId, phone").in("studentId", studentIds),
    planIds.length
      ? supabase.from("Plan").select("id, name").in("id", planIds)
      : Promise.resolve({ data: [] as { id: string; name: string | null }[] }),
  ]);

  const userById = new Map((users ?? []).map((u) => [u.id, u]));
  const profileByStudent = new Map((profiles ?? []).map((p) => [p.studentId, p]));
  const planById = new Map((plans ?? []).map((p) => [p.id, p]));

  return students.map((s) => {
    const u = userById.get(s.userId);
    const prof = profileByStudent.get(s.id);
    const plan = s.planId ? planById.get(s.planId) : undefined;
    return {
      studentId: s.id,
      name: u?.name ?? null,
      email: u?.email ?? null,
      phone: (prof as { phone?: string | null } | undefined)?.phone ?? null,
      planName: plan?.name ?? null,
    };
  });
}
