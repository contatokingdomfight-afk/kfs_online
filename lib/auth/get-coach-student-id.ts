"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "./get-current-user";

/**
 * Verifica se o coach atual também tem perfil de aluno
 * Retorna o studentId se existir, null caso contrário
 */
export async function getCoachStudentId(): Promise<string | null> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser || (dbUser.role !== "COACH" && dbUser.role !== "ADMIN")) return null;

  const supabase = await createClient();

  const { data: coach } = await supabase
    .from("Coach")
    .select("studentId")
    .eq("userId", dbUser.id)
    .maybeSingle();

  return coach?.studentId || null;
}
