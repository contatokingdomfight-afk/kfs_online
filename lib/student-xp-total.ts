import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClientOrNull } from "@/lib/supabase/admin";
import { levelFromXp, type LevelInfo } from "@/lib/levels";

/** XP total oficial do aluno (vista `StudentXpEvent`, regras do admin). Lido pelo servidor. */
export async function loadStudentXpTotal(fallback: SupabaseClient, studentId: string): Promise<number> {
  const client = getAdminClientOrNull().client ?? fallback;
  const { data, error } = await client.from("StudentXpEvent").select("xp").eq("student_id", studentId);
  if (error) {
    console.error("[xp] loadStudentXpTotal:", error.message);
    return 0;
  }
  return ((data ?? []) as { xp: number | null }[]).reduce((s, r) => s + (Number(r.xp) || 0), 0);
}

export async function loadStudentLevel(fallback: SupabaseClient, studentId: string): Promise<LevelInfo> {
  return levelFromXp(await loadStudentXpTotal(fallback, studentId));
}
