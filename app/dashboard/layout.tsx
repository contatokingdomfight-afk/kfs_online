import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getViewAsFromCookies } from "@/lib/view-as-server";
import { getThemeFromCookies, getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { ViewAsBanner } from "@/components/ViewAsBanner";
import { ResponsiveShell } from "@/components/ResponsiveShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) redirect("/sign-in");

  if (dbUser.role === "COACH") redirect("/coach");
  let viewAs: "aluno" | "coach" | null = null;
  if (dbUser.role === "ADMIN") {
    viewAs = await getViewAsFromCookies();
    if (viewAs === "coach") redirect("/coach");
    if (viewAs !== "aluno") redirect("/admin");
  }

  const [theme, locale] = await Promise.all([getThemeFromCookies(), getLocaleFromCookies()]);
  const t = getTranslations(locale as "pt" | "en");
  const sidebarLinks = [
    { label: t("navHome"), href: "/dashboard" },
    { label: t("navLibrary"), href: "/dashboard/biblioteca" },
    { label: t("navEvents"), href: "/dashboard/eventos" },
    { label: t("navFinance"), href: "/dashboard/financeiro" },
    { label: t("navProfile"), href: "/dashboard/perfil" },
  ];

  return (
    <div data-dashboard style={{ minHeight: "100vh", backgroundColor: "var(--bg)", color: "var(--text-primary)" }}>
      <ResponsiveShell
        sidebarTitle={t("studentArea")}
        sidebarLinks={sidebarLinks}
        initialTheme={theme}
        initialLocale={locale}
        headerTitle="Kingdom Fight School"
        viewAsBanner={dbUser.role === "ADMIN" && viewAs === "aluno" ? <ViewAsBanner viewAs="aluno" /> : undefined}
        mainClassName="dashboard-main"
      >
        {children}
      </ResponsiveShell>
    </div>
  );
}
