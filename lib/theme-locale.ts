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

/** Lê tema/língua dos cookies no browser (o layout raiz já não lê cookies, para as páginas poderem ser estáticas). */
export function readThemeLocaleFromDocument(): { theme: Theme; locale: Locale } {
  const get = (name: string) =>
    document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${name}=`))
      ?.slice(name.length + 1);
  return { theme: get(THEME_COOKIE) === "light" ? "light" : "dark", locale: get(LOCALE_COOKIE) === "en" ? "en" : "pt" };
}

/** Evento disparado no browser quando o utilizador troca de língua. */
export const LOCALE_CHANGE_EVENT = "kfs-locale-change";

/** Corre no <head> antes do 1.º paint: aplica data-theme e lang a partir dos cookies (sem piscar). */
export const THEME_LOCALE_BOOT_SCRIPT = `(function(){try{var c=document.cookie,d=document.documentElement;if(/(?:^|; )${THEME_COOKIE}=light(?:;|$)/.test(c))d.setAttribute('data-theme','light');if(/(?:^|; )${LOCALE_COOKIE}=en(?:;|$)/.test(c))d.setAttribute('lang','en');}catch(e){}})();`;
