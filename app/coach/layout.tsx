import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getViewAsFromCookies } from "@/lib/view-as-server";
import { getThemeFromCookies, getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { ViewAsBanner } from "@/components/ViewAsBanner";
import { ResponsiveShell } from "@/components/ResponsiveShell";

export default async function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) redirect("/sign-in");
  if (dbUser.role !== "COACH" && dbUser.role !== "ADMIN") redirect("/dashboard");

  const [viewAs, theme, locale] = await Promise.all([
    dbUser.role === "ADMIN" ? getViewAsFromCookies() : Promise.resolve(null),
    getThemeFromCookies(),
    getLocaleFromCookies(),
  ]);
  const t = getTranslations(locale as "pt" | "en");
  const coachLinks = [
    ...(dbUser.role === "ADMIN"
      ? [{ label: "Admin", href: "/admin" as string }]
      : []),
    { label: t("navHome"), href: "/coach" },
    { label: t("navEnterClass"), href: "/coach/aula" },
    { label: t("navWeekTheme"), href: "/coach/tema-semana" },
    { label: t("navAgenda"), href: "/coach/agenda" },
    { label: t("navStudents"), href: "/coach/alunos" },
    { label: t("navAthletesCoach"), href: "/coach/atletas" },
  ];
  const showViewAsBanner = dbUser.role === "ADMIN";

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", color: "var(--text-primary)" }}>
      <ResponsiveShell
        sidebarTitle={t("coachTitle")}
        sidebarLinks={coachLinks}
        initialTheme={theme}
        initialLocale={locale}
        headerTitle="Kingdom Fight School"
        headerExtra={<span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Coach</span>}
        viewAsBanner={showViewAsBanner ? <ViewAsBanner viewAs="coach" /> : undefined}
      >
        {children}
      </ResponsiveShell>
    </div>
  );
}
