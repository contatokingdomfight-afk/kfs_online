import type { User as SupabaseUser } from "@supabase/supabase-js";
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

  console.log("[syncUser] a sincronizar utilizador", { authUserId, email });

  const { data: existing, error: findErr } = await supabase
    .from("User")
    .select("id, authUserId, email, name, role")
    .eq("authUserId", authUserId)
    .maybeSingle();

  if (findErr) {
    console.error("[syncUser] erro ao procurar User por authUserId:", findErr);
    throw findErr;
  }

  let userId: string;

  if (existing) {
    console.log("[syncUser] utilizador existente encontrado:", existing.id, "role:", existing.role);
    const { error: updateErr } = await supabase
      .from("User")
      .update({ email, name })
      .eq("id", existing.id);
    if (updateErr) {
      console.error("[syncUser] erro ao atualizar User:", updateErr);
    }
    userId = existing.id;
  } else {
    console.log("[syncUser] utilizador não encontrado — a criar novo ALUNO");
    const id = crypto.randomUUID();
    const { error: insertError } = await supabase.from("User").insert({
      id,
      authUserId,
      email,
      name,
      role: "ALUNO",
    });

    if (insertError) {
      console.error("[syncUser] erro ao inserir User:", insertError);
      if (insertError.code === "23505") {
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

  const { data: student, error: studentFindErr } = await supabase
    .from("Student")
    .select("id")
    .eq("userId", userId)
    .maybeSingle();

  if (studentFindErr) {
    console.error("[syncUser] erro ao procurar Student:", studentFindErr);
  }

  if (!student) {
    console.log("[syncUser] sem Student — a procurar escola ativa para criar");
    const { data: defaultSchool, error: schoolErr } = await supabase
      .from("School")
      .select("id")
      .eq("isActive", true)
      .order("createdAt", { ascending: true })
      .limit(1)
      .single();

    if (schoolErr || !defaultSchool) {
      console.error("[syncUser] erro ao procurar escola ativa:", schoolErr);
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
      console.log("[syncUser] Student já existia (race condition) — a recuperar id");
      const { data: existingStudent } = await supabase
        .from("Student")
        .select("id")
        .eq("userId", userId)
        .single();
      // studentId ignorado — não usado para StudentProfile (tabela não existe)
      void existingStudent;
    } else if (studentError) {
      console.error("[syncUser] erro ao criar Student:", studentError);
      throw studentError;
    } else {
      console.log("[syncUser] Student criado:", newStudentId);
    }
  } else {
    console.log("[syncUser] Student encontrado:", student.id);
  }

  // Não incluir avatarUrl aqui: a coluna pode não existir em todas as BD (Prisma User sem avatarUrl).
  // O perfil volta a ler avatar noutras queries quando a coluna existir.
  const { data: user, error: userFetchErr } = await supabase
    .from("User")
    .select("id, authUserId, email, name, role, createdAt")
    .eq("id", userId)
    .single();

  if (userFetchErr) {
    console.error("[syncUser] erro ao buscar User final:", userFetchErr);
    throw userFetchErr;
  }

  console.log("[syncUser] user retornado:", user?.id, "role:", user?.role);

  // hasCompletedOnboarding: sem tabela StudentProfile neste projeto, assume-se true
  return { user, hasCompletedOnboarding: true };
}
