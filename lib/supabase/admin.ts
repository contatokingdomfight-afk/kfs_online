import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com service role (apenas no servidor, apenas para ações de admin).
 * Usar para: convidar utilizadores, criar/atualizar auth users.
 * Variável de ambiente: SUPABASE_SERVICE_ROLE_KEY
 */
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios para operações admin.");
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export type AdminClientResult =
  | { client: SupabaseClient; error?: undefined }
  | { client: null; error: "missing" | "wrong_key" };

/**
 * Retorna o cliente admin ou null + motivo. Use nas páginas para evitar erro 500 e mostrar mensagem amigável.
 * "wrong_key" = a chave configurada parece ser a publishable (sb_publishable_...); é necessária a service_role.
 */
export function getAdminClientOrNull(): AdminClientResult {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { client: null, error: "missing" };
  if (key.startsWith("sb_publishable_")) {
    return { client: null, error: "wrong_key" };
  }
  return {
    client: createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }),
  };
}
