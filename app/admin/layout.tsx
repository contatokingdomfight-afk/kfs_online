import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getThemeFromCookies, getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { ViewAsSwitcher } from "@/components/ViewAsSwitcher";
import { ResponsiveShell } from "@/components/ResponsiveShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) redirect("/sign-in");
  if (dbUser.role !== "ADMIN") redirect("/dashboard");

  const [theme, locale] = await Promise.all([getThemeFromCookies(), getLocaleFromCookies()]);
  const t = getTranslations(locale as "pt" | "en");
  const adminLinks = [
    { label: t("navHome"), href: "/admin" },
    { label: t("navStudents"), href: "/admin/alunos" },
    { label: t("navAthletes"), href: "/admin/atletas" },
    { label: t("navClasses"), href: "/admin/turmas" },
    { label: t("navLocations"), href: "/admin/locais" },
    { label: t("navModalities"), href: "/admin/modalidades" },
    { label: t("navPlans"), href: "/admin/planos" },
    { label: t("navCourses"), href: "/admin/cursos" },
    { label: t("navEventsAdmin"), href: "/admin/eventos" },
    { label: t("navSettings"), href: "/admin/configuracoes" },
    { label: t("navPresence"), href: "/admin/presenca" },
    { label: t("navGeneralDimensions"), href: "/admin/componentes-gerais" },
    { label: t("navEvaluationCriteria"), href: "/admin/avaliacao" },
    { label: t("navMissions"), href: "/admin/missoes" },
    { label: t("navFinance"), href: "/admin/financeiro" },
    { label: t("navTrials"), href: "/admin/experimentais" },
    { label: t("navCoaches"), href: "/admin/coaches" },
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", color: "var(--text-primary)" }}>
      <ResponsiveShell
        sidebarTitle="Admin"
        sidebarLinks={adminLinks}
        initialTheme={theme}
        initialLocale={locale}
        headerTitle="Kingdom Fight School"
        headerExtra={
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <ViewAsSwitcher />
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Admin</span>
          </div>
        }
      >
        {children}
      </ResponsiveShell>
    </div>
  );
}
