import type { SupabaseClient, User as SupabaseUser } from "@supabase/supabase-js";

/**
 * Utilizador de sessão para Server Components / Route Handlers que correm DEPOIS do middleware
 * (o middleware já validou a sessão com `getUser()` e renovou os cookies deste pedido).
 *
 * Usa `getClaims()`: verifica o JWT localmente (sem pedido a `/auth/v1/user`) quando o projeto Supabase
 * assina com chaves assimétricas; com a chave simétrica antiga (HS256) o próprio cliente cai para
 * `getUser()`, ou seja, o comportamento é o de antes e nada se estraga. Poupa uma chamada ao Auth por
 * navegação (o `getUser()` do middleware continua a validar a sessão e a renovar tokens).
 *
 * Devolve só os campos que a app usa (`id`, `email`, `user_metadata`, `app_metadata`).
 */
export async function getAuthUser(supabase: { auth: SupabaseClient["auth"] }): Promise<SupabaseUser | null> {
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;
  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : undefined,
    user_metadata: (claims.user_metadata as Record<string, unknown> | undefined) ?? {},
    app_metadata: (claims.app_metadata as Record<string, unknown> | undefined) ?? {},
    aud: typeof claims.aud === "string" ? claims.aud : "authenticated",
    created_at: "",
  } as SupabaseUser;
}
