export const THEME_COOKIE = "kfs-theme";
export const LOCALE_COOKIE = "kfs-locale";

export type Theme = "dark" | "light";
export type Locale = "pt" | "en";

export function setThemeCookieValue(theme: Theme): string {
  return `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; SameSite=Lax`;
}

export function setLocaleCookieValue(locale: Locale): string {
  return `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
}
