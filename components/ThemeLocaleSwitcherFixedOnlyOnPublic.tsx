"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ThemeLocaleSwitcher } from "@/components/ThemeLocaleSwitcher";
import { readThemeLocaleFromDocument, type Theme, type Locale } from "@/lib/theme-locale";

/**
 * Evita hidratação #418: pathname no 1.º paint do cliente pode não coincidir com o SSR.
 * Até montar no cliente, não renderizar (servidor e cliente = null).
 * Tema/língua vêm dos cookies no browser: o layout raiz não lê cookies, para a home poder ser estática.
 * Rotas de app (incl. check-in autenticado): sem botão flutuante de tema.
 */
export function ThemeLocaleSwitcherFixedOnlyOnPublic() {
  const pathname = usePathname();
  const [prefs, setPrefs] = useState<{ theme: Theme; locale: Locale } | null>(null);
  useEffect(() => setPrefs(readThemeLocaleFromDocument()), []);

  if (!prefs) {
    return null;
  }

  const isAppRoute =
    pathname?.startsWith("/dashboard") ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/coach") ||
    pathname?.startsWith("/check-in");
  if (isAppRoute) return null;
  return <ThemeLocaleSwitcher initialTheme={prefs.theme} initialLocale={prefs.locale} variant="fixed" />;
}
