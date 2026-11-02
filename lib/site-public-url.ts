/**
 * Origem pública para links de partilha e metadata (OG).
 * Preferir NEXT_PUBLIC_SITE_URL em produção.
 */
export function getPublicOrigin(): string {
  const u = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (u) return u.replace(/\/$/, "");
  // Em produção, o domínio oficial do projeto — VERCEL_URL é o URL único de cada deployment.
  const p = process.env.VERCEL_ENV === "production" ? process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() : "";
  if (p) return `https://${p.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  const v = process.env.VERCEL_URL?.trim();
  if (v) return `https://${v.replace(/^https?:\/\//, "")}`;
  return "http://localhost:3000";
}
