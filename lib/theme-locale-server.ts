import { cookies } from "next/headers";
import { THEME_COOKIE, LOCALE_COOKIE, type Theme, type Locale } from "./theme-locale";

export async function getThemeFromCookies(): Promise<Theme> {
  const c = await cookies();
  const theme = c.get(THEME_COOKIE)?.value;
  if (theme === "light" || theme === "dark") return theme;
  return "dark";
}

export async function getLocaleFromCookies(): Promise<Locale> {
  const c = await cookies();
  const locale = c.get(LOCALE_COOKIE)?.value;
  if (locale === "en" || locale === "pt") return locale;
  return "pt";
}
