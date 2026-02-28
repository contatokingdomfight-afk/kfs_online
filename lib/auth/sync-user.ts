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
    if (insertError) throw insertError;
    userId = id;
  }

  const { data: student } = await supabase
    .from("Student")
    .select("id")
    .eq("userId", userId)
    .maybeSingle();

  if (!student) {
    const studentId = crypto.randomUUID();
    await supabase.from("Student").insert({
      id: studentId,
      userId,
      status: "ATIVO",
    });
  }

  const { data: user } = await supabase
    .from("User")
    .select("id, authUserId, email, name, role, createdAt")
    .eq("id", userId)
    .single();

  return user;
}
