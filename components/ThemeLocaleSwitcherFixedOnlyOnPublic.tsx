"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ThemeLocaleSwitcher } from "@/components/ThemeLocaleSwitcher";
import type { Theme, Locale } from "@/lib/theme-locale";

/**
 * Evita hidratação #418: pathname no 1.º paint do cliente pode não coincidir com o SSR.
 * Até montar no cliente, não renderizar (servidor e cliente = null).
 * Rotas de app (incl. check-in autenticado): sem botão flutuante de tema.
 */
export function ThemeLocaleSwitcherFixedOnlyOnPublic({
  initialTheme,
  initialLocale,
}: {
  initialTheme: Theme;
  initialLocale: Locale;
}) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return null;
  }

  const isAppRoute =
    pathname?.startsWith("/dashboard") ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/coach") ||
    pathname?.startsWith("/check-in");
  if (isAppRoute) return null;
  return (
    <ThemeLocaleSwitcher
      initialTheme={initialTheme}
      initialLocale={initialLocale}
      variant="fixed"
    />
  );
}
