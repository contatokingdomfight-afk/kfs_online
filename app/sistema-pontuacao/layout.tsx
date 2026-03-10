import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getThemeFromCookies, getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { ResponsiveShell } from "@/components/ResponsiveShell";

export default async function SistemaPontuacaoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) redirect("/sign-in");

  const [theme, locale] = await Promise.all([getThemeFromCookies(), getLocaleFromCookies()]);
  const t = getTranslations(locale as "pt" | "en");

  const homeHref =
    dbUser.role === "COACH"
      ? "/coach"
      : dbUser.role === "ADMIN"
        ? "/admin"
        : "/dashboard";

  const sidebarLinks = [
    { label: t("navHome") || "Início", href: homeHref },
    { label: "Sistema de pontuação", href: "/sistema-pontuacao" },
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", color: "var(--text-primary)" }}>
      <ResponsiveShell
        sidebarTitle="Kingdom Fight School"
        sidebarLinks={sidebarLinks}
        initialTheme={theme}
        initialLocale={locale}
        headerTitle="Kingdom Fight School"
        logoutLabel={locale === "pt" ? "Sair" : "Logout"}
      >
        {children}
      </ResponsiveShell>
    </div>
  );
}
