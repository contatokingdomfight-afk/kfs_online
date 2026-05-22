/**
 * URL de redirect OAuth Supabase (deve estar em Authentication → Redirect URLs).
 */
export function buildAuthCallbackUrl(origin: string, nextPath?: string | null): string {
  const base = origin.replace(/\/$/, "");
  if (nextPath && nextPath.startsWith("/")) {
    return `${base}/auth/callback?next=${encodeURIComponent(nextPath)}`;
  }
  return `${base}/auth/callback`;
}

/** Caminhos que, ao abrir na app nativa, devem fechar o browser OAuth e carregar no WebView. */
export function isAuthCallbackDeepLink(url: string): boolean {
  if (/\/auth\/callback/i.test(url)) return true;
  try {
    const normalized = url.replace(/^com\.kingdomfight\.school:\/\//i, "https://app/");
    const path = new URL(normalized).pathname.replace(/^\/+/, "");
    return path === "auth/callback" || path.startsWith("auth/callback");
  } catch {
    return false;
  }
}
