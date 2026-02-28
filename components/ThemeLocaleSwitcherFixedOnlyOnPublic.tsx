"use client";

import { usePathname } from "next/navigation";
import { ThemeLocaleSwitcher } from "@/components/ThemeLocaleSwitcher";
import type { Theme, Locale } from "@/lib/theme-locale";

export function ThemeLocaleSwitcherFixedOnlyOnPublic({
  initialTheme,
  initialLocale,
}: {
  initialTheme: Theme;
  initialLocale: Locale;
}) {
  const pathname = usePathname();
  const isAppRoute =
    pathname?.startsWith("/dashboard") ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/coach");
  if (isAppRoute) return null;
  return (
    <ThemeLocaleSwitcher
      initialTheme={initialTheme}
      initialLocale={initialLocale}
      variant="fixed"
    />
  );
}
