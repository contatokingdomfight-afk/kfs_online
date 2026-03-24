import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * IDs de alunos cujo utilizador ou telefone (perfil) corresponde à pesquisa.
 * Máx. 40 resultados; nome/email/telefone com ilike.
 */
export async function searchStudentIdsByQuery(supabase: SupabaseClient, query: string): Promise<string[]> {
  const safe = query.trim().replace(/%/g, "").replace(/_/g, "");
  if (safe.length < 2) return [];
  const like = `%${safe}%`;

  const [{ data: byName }, { data: byEmail }, { data: byPhone }] = await Promise.all([
    supabase.from("User").select("id").ilike("name", like).limit(30),
    supabase.from("User").select("id").ilike("email", like).limit(30),
    supabase.from("StudentProfile").select("studentId").ilike("phone", like).limit(30),
  ]);

  const userIds = new Set<string>(
    [...(byName ?? []), ...(byEmail ?? [])].map((r) => (r as { id: string }).id)
  );
  const phoneStudentIds = new Set(
    (byPhone ?? []).map((r) => (r as { studentId: string }).studentId)
  );

  const { data: studentsByUser } = userIds.size
    ? await supabase.from("Student").select("id").in("userId", [...userIds])
    : { data: [] as { id: string }[] };

  const studentIdSet = new Set<string>([
    ...(studentsByUser ?? []).map((s) => s.id),
    ...phoneStudentIds,
  ]);

  return [...studentIdSet].slice(0, 40);
}
