"use server";

import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { searchStudentIdsByQuery } from "@/lib/admin-search-students";

export type ChatStudentSearchResult = { error: string } | { results: Array<{ studentId: string; name: string; email: string }> };

/** Busca de aluno por nome/email/telefone para o assistente do admin (chat). */
export async function searchStudentsForChat(query: string): Promise<ChatStudentSearchResult> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return { error: "Não autorizado." };

  const q = query.trim();
  if (q.length < 2) return { error: "Indica pelo menos 2 caracteres." };

  const supabase = createAdminClient();
  const ids = await searchStudentIdsByQuery(supabase, q);
  if (ids.length === 0) return { results: [] };

  const { data: students } = await supabase.from("Student").select("id, userId").in("id", ids);
  const userIds = [...new Set((students ?? []).map((s) => s.userId))];
  const { data: users } = await supabase.from("User").select("id, name, email").in("id", userIds);
  const userById = new Map((users ?? []).map((u) => [u.id, u]));

  const results = (students ?? []).map((s) => {
    const u = userById.get(s.userId);
    return {
      studentId: s.id as string,
      name: u?.name ?? u?.email ?? "—",
      email: u?.email ?? "",
    };
  });

  results.sort((a, b) => a.name.localeCompare(b.name, "pt"));
  return { results: results.slice(0, 8) };
}

/** Lista de escolas ativas, para o assistente perguntar (ou pular, se só houver uma). */
export async function getSchoolsForChat(): Promise<{ id: string; name: string }[]> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || dbUser.role !== "ADMIN") return [];

  const supabase = createAdminClient();
  const { data } = await supabase.from("School").select("id, name").eq("isActive", true).order("name", { ascending: true });
  return data ?? [];
}
