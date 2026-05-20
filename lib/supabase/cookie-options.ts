import type { CookieOptions } from "@supabase/ssr";

/** Preferência do browser: `1` ou ausente = sessão longa; `0` = sessão mais curta (PC partilhado). */
export const REMEMBER_DEVICE_COOKIE_NAME = "kfs_auth_long";

/** Quanto tempo guardamos a escolha «manter ligado» no cookie de preferência (não é o JWT). */
export const REMEMBER_DEVICE_CHOICE_MAX_AGE_SEC = 365 * 24 * 60 * 60;

/** Alinhado ao default típico do @supabase/ssr (~400 dias). */
export const SESSION_COOKIE_MAX_AGE_LONG_SEC = 400 * 24 * 60 * 60;

/** Sessão «não manter»: ainda permite dias de uso sem voltar a pedir login constante. */
export const SESSION_COOKIE_MAX_AGE_SHORT_SEC = 30 * 24 * 60 * 60;

export function rememberLongSessionFromCookieValue(value: string | undefined): boolean {
  if (value === undefined || value === "") return true;
  return value !== "0";
}

export function resolveSupabaseCookieOptions(rememberLongSession: boolean): CookieOptions {
  const maxAge = rememberLongSession ? SESSION_COOKIE_MAX_AGE_LONG_SEC : SESSION_COOKIE_MAX_AGE_SHORT_SEC;
  return {
    path: "/",
    sameSite: "lax",
    maxAge,
    ...(process.env.NODE_ENV === "production" ? { secure: true } : {}),
  };
}

/** Compat: preferência «longa» quando não há acesso ao pedido. */
export const supabaseCookieOptions: CookieOptions = resolveSupabaseCookieOptions(true);
