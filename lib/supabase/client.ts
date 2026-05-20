import { createBrowserClient } from "@supabase/ssr";
import { readRememberLongSessionFromDocumentCookie } from "@/lib/auth/remember-device";
import { resolveSupabaseCookieOptions } from "@/lib/supabase/cookie-options";

function readPublicSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return { url: url || "", key: key || "" };
}

export function createClient() {
  const { url, key } = readPublicSupabaseEnv();
  if (!url || !key) {
    throw new Error(
      "[KFS] Supabase URL ou anon key em falta no bundle do browser. " +
        "Na Vercel: Settings → Environment Variables → para NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY " +
        "marca o ambiente Preview (e Production), guarda, e faz Redeploy do deployment Preview (sem cache). " +
        "Se usares «Aplicar só a certas branches», inclui a branch dev. " +
        "Valores: Supabase → Project Settings → API."
    );
  }
  const rememberLong = readRememberLongSessionFromDocumentCookie();
  return createBrowserClient(
    url,
    key,
    {
      cookieOptions: resolveSupabaseCookieOptions(rememberLong),
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  );
}
