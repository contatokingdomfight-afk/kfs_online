"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "./get-current-user";

/**
 * Obtém o schoolId do usuário atual baseado no seu perfil (Student ou Coach)
 * Retorna null se não encontrar escola associada
 */
export async function getCurrentSchoolId(): Promise<string | null> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) return null;

  const supabase = await createClient();

  // Se for ALUNO, buscar schoolId do Student
  if (dbUser.role === "ALUNO") {
    const { data: student } = await supabase
      .from("Student")
      .select("schoolId")
      .eq("userId", dbUser.id)
      .single();
    return student?.schoolId || null;
  }

  // Coach: primeira escola associada em CoachSchool (para contextos que precisam de um único id)
  if (dbUser.role === "COACH" || dbUser.role === "ADMIN") {
    const { data: coach } = await supabase.from("Coach").select("id").eq("userId", dbUser.id).maybeSingle();
    if (coach?.id) {
      const { data: links } = await supabase
        .from("CoachSchool")
        .select("schoolId")
        .eq("coachId", coach.id)
        .limit(1);
      if (links?.[0]?.schoolId) return links[0].schoolId;
    }
  }

  // ADMIN pode não ter coach associado, então retorna null (acesso a todas as escolas)
  return null;
}

/**
 * Verifica se o usuário tem acesso a uma escola específica
 * ADMIN tem acesso a todas as escolas
 */
export async function hasAccessToSchool(schoolId: string): Promise<boolean> {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) return false;

  // ADMIN tem acesso a tudo
  if (dbUser.role === "ADMIN") return true;

  const supabase = await createClient();

  if (dbUser.role === "ALUNO") {
    const currentSchoolId = await getCurrentSchoolId();
    return currentSchoolId === schoolId;
  }

  if (dbUser.role === "COACH") {
    const { data: coach } = await supabase.from("Coach").select("id").eq("userId", dbUser.id).maybeSingle();
    if (!coach?.id) return false;
    const { data: row } = await supabase
      .from("CoachSchool")
      .select("schoolId")
      .eq("coachId", coach.id)
      .eq("schoolId", schoolId)
      .maybeSingle();
    return row != null;
  }

  return false;
}
