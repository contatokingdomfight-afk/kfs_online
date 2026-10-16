import "server-only";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { rewriteSupabaseLegacyStoragePublicUrl } from "@/lib/supabase/rewrite-storage-public-url";

/**
 * Alcunhas («apelido de lutador») dos alunos do ranking, por studentId.
 * Via service role: o RLS do StudentProfile não deixa ler o perfil de outros alunos,
 * e aqui só sai a alcunha (que o aluno escolheu para aparecer nas aulas e no ranking).
 */
/** Fotos de perfil (User.avatarUrl) dos alunos do ranking, por studentId. */
export async function loadRankAvatars(studentIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const admin = getAdminClientOrNull().client;
  if (!admin || studentIds.length === 0) return out;
  const ids = [...new Set(studentIds)];
  for (let i = 0; i < ids.length; i += 200) {
    const { data: students } = await admin.from("Student").select("id, userId").in("id", ids.slice(i, i + 200));
    const userToStudent = new Map(((students ?? []) as { id: string; userId: string }[]).map((s) => [s.userId, s.id]));
    if (userToStudent.size === 0) continue;
    const { data: users } = await admin.from("User").select("id, avatarUrl").in("id", [...userToStudent.keys()]);
    for (const u of (users ?? []) as { id: string; avatarUrl: string | null }[]) {
      const sid = userToStudent.get(u.id);
      const url = rewriteSupabaseLegacyStoragePublicUrl(u.avatarUrl) ?? u.avatarUrl;
      if (sid && url) out.set(sid, url);
    }
  }
  return out;
}

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
