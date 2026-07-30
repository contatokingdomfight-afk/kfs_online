import type { SupabaseClient } from "@supabase/supabase-js";

const PASSWORD_CHARS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Senha inicial legível (sem caracteres ambíguos 0/O, 1/l/I). */
export function generateInitialPassword(length = 10): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += PASSWORD_CHARS[bytes[i]! % PASSWORD_CHARS.length];
  }
  return out;
}

export type CreateConfirmedAuthUserResult =
  | { authUserId: string; email: string }
  | { error: string };

/** Cria utilizador Supabase Auth com email confirmado (sem enviar convite). */
export async function createConfirmedAuthUser(
  supabase: SupabaseClient,
  params: { email: string; password: string; name?: string | null }
): Promise<CreateConfirmedAuthUserResult> {
  const email = params.email.trim().toLowerCase();
  const password = params.password;

  if (password.length < 6) {
    return { error: "A senha inicial deve ter pelo menos 6 caracteres." };
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: params.name ? { full_name: params.name } : undefined,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already been registered") || msg.includes("already exists") || msg.includes("duplicate")) {
      return { error: "Já existe um utilizador com este email." };
    }
    return { error: error.message };
  }

  const authUserId = data.user?.id;
  if (!authUserId) {
    return { error: "Não foi possível criar o utilizador de autenticação." };
  }

  return { authUserId, email: data.user?.email ?? email };
}
