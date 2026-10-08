import "server-only";
import { getAdminClientOrNull } from "@/lib/supabase/admin";

/**
 * Alcunhas («apelido de lutador») dos alunos do ranking, por studentId.
 * Via service role: o RLS do StudentProfile não deixa ler o perfil de outros alunos,
 * e aqui só sai a alcunha (que o aluno escolheu para aparecer nas aulas e no ranking).
 */
export async function loadRankNicknames(studentIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const admin = getAdminClientOrNull().client;
  if (!admin || studentIds.length === 0) return out;
  const ids = [...new Set(studentIds)];
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await admin
      .from("StudentProfile")
      .select("studentId, nickname")
      .in("studentId", ids.slice(i, i + 200))
      .not("nickname", "is", null);
    for (const row of (data ?? []) as { studentId: string; nickname: string | null }[]) {
      const nick = row.nickname?.trim();
      if (nick) out.set(row.studentId, nick);
    }
  }
  return out;
}
