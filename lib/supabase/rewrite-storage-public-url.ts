/**
 * Após mudar o ref do projecto Supabase, a coluna `User.avatarUrl` pode ainda apontar ao host antigo
 * (`*.supabase.co` diferente), o que causa `ERR_NAME_NOT_RESOLVED` no browser.
 * Reutiliza o path `/storage/v1/object/public/...` com o origin configurado na app.
 */
export function rewriteSupabaseLegacyStoragePublicUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "").trim();
  if (!base) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (!parsed.hostname.endsWith(".supabase.co")) return trimmed;
    const marker = "/storage/v1/object/public/";
    const i = parsed.pathname.indexOf(marker);
    if (i === -1) return trimmed;
    const rest = parsed.pathname.slice(i) + parsed.search + parsed.hash;
    return `${base}${rest}`;
  } catch {
    return trimmed;
  }
}
