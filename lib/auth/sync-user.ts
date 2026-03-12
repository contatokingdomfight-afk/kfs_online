import type { User as SupabaseUser } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Sincroniza o utilizador do Supabase Auth com a tabela User (e cria Student se não existir).
 * Usa o cliente Supabase (HTTPS) em vez de Prisma para funcionar mesmo quando a conexão
 * direta à BD (porta 5432) não está acessível.
 */
export async function syncUser(supabaseUser: SupabaseUser) {
  const supabase = await createClient();

  const authUserId = supabaseUser.id;
  const email = supabaseUser.email ?? "";
  const name =
    supabaseUser.user_metadata?.full_name ??
    supabaseUser.user_metadata?.name ??
    null;

  const { data: existing } = await supabase
    .from("User")
    .select("id, authUserId, email, name, role")
    .eq("authUserId", authUserId)
    .maybeSingle();

  let userId: string;

  if (existing) {
    await supabase
      .from("User")
      .update({ email, name })
      .eq("id", existing.id);
    userId = existing.id;
  } else {
    const id = crypto.randomUUID();
    const { error: insertError } = await supabase.from("User").insert({
      id,
      authUserId,
      email,
      name,
      role: "ALUNO",
    });
    
    // Se der erro de duplicação, significa que outro request criou o user
    // Buscar o user existente em vez de falhar
    if (insertError) {
      if (insertError.code === '23505') {
        // Duplicate key - buscar o user que foi criado
        const { data: existingUser } = await supabase
          .from("User")
          .select("id")
          .eq("authUserId", authUserId)
          .single();
        
        if (existingUser) {
          userId = existingUser.id;
        } else {
          throw insertError;
        }
      } else {
        throw insertError;
      }
    } else {
      userId = id;
    }
  }

  const { data: student } = await supabase
    .from("Student")
    .select("id")
    .eq("userId", userId)
    .maybeSingle();

  let studentId: string | null = null;

  if (!student) {
    // Buscar escola padrão (primeira escola ativa)
    const { data: defaultSchool } = await supabase
      .from("School")
      .select("id")
      .eq("isActive", true)
      .order("createdAt", { ascending: true })
      .limit(1)
      .single();

    if (!defaultSchool) {
      throw new Error("Nenhuma escola ativa encontrada. Configure uma escola primeiro.");
    }

    const newStudentId = crypto.randomUUID();
    const { error: studentError } = await supabase.from("Student").insert({
      id: newStudentId,
      userId,
      schoolId: defaultSchool.id,
      status: "ATIVO",
    });

    // Ignorar erro de duplicação (race condition) - buscar o student existente
    if (studentError && studentError.code === "23505") {
      const { data: existingStudent } = await supabase
        .from("Student")
        .select("id")
        .eq("userId", userId)
        .single();
      studentId = existingStudent?.id ?? null;
      if (studentId) {
        const { data: existingProfile } = await supabase
          .from("StudentProfile")
          .select("id")
          .eq("studentId", studentId)
          .maybeSingle();
        if (!existingProfile) {
          await supabase.from("StudentProfile").insert({
            id: crypto.randomUUID(),
            studentId,
            hasCompletedOnboarding: false,
          });
        }
      }
    } else if (studentError) {
      throw studentError;
    } else {
      studentId = newStudentId;
      // Criar StudentProfile com hasCompletedOnboarding = false para novo aluno
      await supabase.from("StudentProfile").insert({
        id: crypto.randomUUID(),
        studentId: newStudentId,
        hasCompletedOnboarding: false,
      });
    }
  } else {
    studentId = student.id;
    // Garantir que StudentProfile existe (alunos antigos podem não ter)
    const { data: existingProfile } = await supabase
      .from("StudentProfile")
      .select("id")
      .eq("studentId", studentId)
      .maybeSingle();
    if (!existingProfile) {
      await supabase.from("StudentProfile").insert({
        id: crypto.randomUUID(),
        studentId,
        hasCompletedOnboarding: false,
      });
    }
  }

  const { data: user } = await supabase
    .from("User")
    .select("id, authUserId, email, name, role, createdAt")
    .eq("id", userId)
    .single();

  // Verificar se precisa de onboarding (para redirecionamento)
  let hasCompletedOnboarding = true;
  if (studentId) {
    const { data: profile } = await supabase
      .from("StudentProfile")
      .select("hasCompletedOnboarding")
      .eq("studentId", studentId)
      .maybeSingle();
    hasCompletedOnboarding = profile?.hasCompletedOnboarding ?? false;
  }

  return { user, hasCompletedOnboarding };
}
