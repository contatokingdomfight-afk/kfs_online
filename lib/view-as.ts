export const VIEW_AS_COOKIE = "kfs-view-as";

export type ViewAsRole = "aluno" | "coach";

export function setViewAsCookieValue(role: ViewAsRole | ""): string {
  if (!role) return `${VIEW_AS_COOKIE}=; path=/; max-age=0`;
  return `${VIEW_AS_COOKIE}=${role}; path=/; max-age=86400; SameSite=Lax`;
}
