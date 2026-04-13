import type { CookieOptions } from "@supabase/ssr";

/**
 * Opções alinhadas ao default do @supabase/ssr (~400 dias de maxAge).
 * `secure: true` em produção (HTTPS) melhora persistência em browsers móveis.
 */
const MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

export const supabaseCookieOptions: CookieOptions = {
  path: "/",
  sameSite: "lax",
  maxAge: MAX_AGE_SECONDS,
  ...(process.env.NODE_ENV === "production" ? { secure: true } : {}),
};
