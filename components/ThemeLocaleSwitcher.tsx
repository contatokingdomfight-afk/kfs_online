"use client";

import { useRouter } from "next/navigation";
import {
  setThemeCookieValue,
  setLocaleCookieValue,
  type Theme,
  type Locale,
} from "@/lib/theme-locale";

const label: Record<Locale, { theme: string; light: string; dark: string; lang: string; pt: string; en: string }> = {
  pt: {
    theme: "Tema",
    light: "Claro",
    dark: "Escuro",
    lang: "Idioma",
    pt: "PT",
    en: "EN",
  },
  en: {
    theme: "Theme",
    light: "Light",
    dark: "Dark",
    lang: "Language",
    pt: "PT",
    en: "EN",
  },
};

export function ThemeLocaleSwitcher({
  initialTheme,
  initialLocale,
  variant = "fixed",
}: {
  initialTheme: Theme;
  initialLocale: Locale;
  variant?: "fixed" | "inline";
}) {
  const router = useRouter();
  const t = label[initialLocale];

  function setTheme(theme: Theme) {
    document.cookie = setThemeCookieValue(theme);
    document.documentElement.setAttribute("data-theme", theme);
    router.refresh();
  }

  function setLocale(locale: Locale) {
    document.cookie = setLocaleCookieValue(locale);
    router.refresh();
  }

  const wrapper: React.CSSProperties =
    variant === "inline"
      ? {
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: "12px 16px",
          marginTop: "auto",
          borderTop: "1px solid var(--border)",
        }
      : {
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "8px 12px",
          borderRadius: 10,
          backgroundColor: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        };

  const group: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 6,
  };

  const groupLabel: React.CSSProperties = {
    fontSize: 12,
    color: "var(--text-secondary)",
    marginRight: 4,
  };

  const btn: React.CSSProperties = {
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 500,
    border: "1px solid var(--border)",
    borderRadius: 6,
    cursor: "pointer",
    backgroundColor: "var(--bg)",
    color: "var(--text-primary)",
  };

  const btnActive: React.CSSProperties = {
    ...btn,
    backgroundColor: "var(--primary)",
    borderColor: "var(--primary)",
    color: "#fff",
  };

  const separator = variant === "inline" ? null : (
    <div style={{ width: 1, height: 20, backgroundColor: "var(--border)" }} />
  );

  return (
    <div
      style={variant === "fixed" ? undefined : wrapper}
      className={
        variant === "fixed"
          ? "fixed bottom-4 right-4 z-[9999] flex items-center gap-3 rounded-[10px] border border-[var(--border)] bg-[var(--bg-secondary)] p-2 shadow-md md:bottom-auto md:top-3 md:right-3"
          : undefined
      }
      role="group"
      aria-label="Tema e idioma"
    >
      <div style={variant === "inline" ? { ...group, flexDirection: "column" as const, alignItems: "stretch", gap: 6 } : group}>
        <span style={groupLabel}>{t.theme}</span>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            style={initialTheme === "dark" ? btnActive : btn}
            onClick={() => setTheme("dark")}
            aria-pressed={initialTheme === "dark"}
          >
            {t.dark}
          </button>
          <button
            type="button"
            style={initialTheme === "light" ? btnActive : btn}
            onClick={() => setTheme("light")}
            aria-pressed={initialTheme === "light"}
          >
            {t.light}
          </button>
        </div>
      </div>
      {separator}
      <div style={variant === "inline" ? { ...group, flexDirection: "column" as const, alignItems: "stretch", gap: 6 } : group}>
        <span style={groupLabel}>{t.lang}</span>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            style={initialLocale === "pt" ? btnActive : btn}
            onClick={() => setLocale("pt")}
            aria-pressed={initialLocale === "pt"}
          >
            {t.pt}
          </button>
          <button
            type="button"
            style={initialLocale === "en" ? btnActive : btn}
            onClick={() => setLocale("en")}
            aria-pressed={initialLocale === "en"}
          >
            {t.en}
          </button>
        </div>
      </div>
    </div>
  );
}
