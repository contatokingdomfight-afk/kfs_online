import type { User as SupabaseUser, SupabaseClient } from "@supabase/supabase-js";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Sincroniza o utilizador do Supabase Auth com a tabela User (e cria Student se não existir).
 *
 * Usa o service role key (server-only) para contornar o RLS —  é seguro porque:
 * - Esta função só é chamada em Server Components / Route Handlers (nunca no cliente)
 * - O service role key não é exposto ao browser (variável sem prefixo NEXT_PUBLIC_)
 *
 * Razão: quando chamada a partir de /auth/callback, o cliente Supabase com cookies
 * ainda não tem a sessão na request (os cookies de sessão são escritos na response),
 * pelo que qualquer cliente baseado em cookies ficaria anónimo e seria bloqueado pelo RLS.
 */
function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "[syncUser] Variáveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas."
    );
  }
  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

export async function syncUser(supabaseUser: SupabaseUser) {
  const supabase = createAdminClient();

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

    if (insertError) {
      if (insertError.code === "23505") {
        // Race condition: outro request criou o utilizador entretanto
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

    if (studentError && studentError.code === "23505") {
      // Race condition na criação do Student
      const { data: existingStudent } = await supabase
        .from("Student")
        .select("id")
        .eq("userId", userId)
        .single();
      studentId = existingStudent?.id ?? null;
      if (studentId) {
        await ensureStudentProfile(supabase, studentId);
      }
    } else if (studentError) {
      throw studentError;
    } else {
      studentId = newStudentId;
      await supabase.from("StudentProfile").insert({
        id: crypto.randomUUID(),
        studentId: newStudentId,
        hasCompletedOnboarding: true,
      });
    }
  } else {
    studentId = student.id;
    await ensureStudentProfile(supabase, student.id);
  }

  const { data: user } = await supabase
    .from("User")
    .select("id, authUserId, email, name, role, createdAt, avatarUrl")
    .eq("id", userId)
    .single();

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureStudentProfile(supabase: SupabaseClient<any>, studentId: string) {
  const { data: existingProfile } = await supabase
    .from("StudentProfile")
    .select("id")
    .eq("studentId", studentId)
    .maybeSingle();
  if (!existingProfile) {
    await supabase.from("StudentProfile").insert({
      id: crypto.randomUUID(),
      studentId,
      hasCompletedOnboarding: true,
    });
  }
}
