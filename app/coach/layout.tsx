import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentCoachId } from "@/lib/auth/get-current-coach";
import { getCoachStudentId } from "@/lib/auth/get-coach-student-id";
import { getViewAsFromCookies } from "@/lib/view-as-server";
import { getThemeFromCookies, getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { ViewAsBanner } from "@/components/ViewAsBanner";
import { ResponsiveShell } from "@/components/ResponsiveShell";
import { getAdminClientOrNull } from "@/lib/supabase/admin";

export default async function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) redirect("/sign-in");
  if (dbUser.role !== "COACH" && dbUser.role !== "ADMIN") redirect("/dashboard");

  if (dbUser.role === "COACH") {
    const coachId = await getCurrentCoachId();
    if (!coachId) redirect("/dashboard?message=coach-access-revoked");
  }

  const result = getAdminClientOrNull();
  const supabase = result.client;

  const [viewAs, theme, locale, coachStudentId] = await Promise.all([
    dbUser.role === "ADMIN" ? getViewAsFromCookies() : Promise.resolve(null),
    getThemeFromCookies(),
    getLocaleFromCookies(),
    getCoachStudentId(),
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
    { label: "Como sou avaliado", href: "/como-sou-avaliado" as string },
    { label: "Meus Cursos", href: "/coach/cursos" as string },
    { label: t("libraryTitle"), href: "/coach/biblioteca" as string },
    { label: "Financeiro", href: "/coach/financeiro" as string },
    { label: t("navSettings"), href: "/coach/configuracoes" as string },
    { label: "Sistema de pontuação", href: "/sistema-pontuacao" },
    ...(coachStudentId
      ? [{ label: t("myStudentArea"), href: "/dashboard" as string }]
      : []),
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
        logoutLabel={locale === "pt" ? "Sair" : "Logout"}
      >
        {children}
      </ResponsiveShell>
    </div>
  );
}
