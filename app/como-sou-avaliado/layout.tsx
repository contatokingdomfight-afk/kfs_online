import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCoachStudentId } from "@/lib/auth/get-coach-student-id";
import { getViewAsFromCookies } from "@/lib/view-as-server";
import { getThemeFromCookies, getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { ResponsiveShell } from "@/components/ResponsiveShell";
import type { SidebarLink } from "@/components/Sidebar";

export default async function ComoSouAvaliadoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) redirect("/sign-in");

  const [theme, locale, coachStudentId, viewAs] = await Promise.all([
    getThemeFromCookies(),
    getLocaleFromCookies(),
    (dbUser.role === "COACH" || dbUser.role === "ADMIN") ? getCoachStudentId() : Promise.resolve(null),
    dbUser.role === "ADMIN" ? getViewAsFromCookies() : Promise.resolve(null),
  ]);
  const t = getTranslations(locale as "pt" | "en");

  let sidebarTitle: string;
  let sidebarLinks: SidebarLink[];
  let headerExtra: React.ReactNode = null;

  if (dbUser.role === "ADMIN" && viewAs !== "aluno") {
    sidebarTitle = "Admin";
    sidebarLinks = [
      { label: t("navHome"), href: "/admin" },
      {
        label: "Avaliação e pontuação",
        href: "/como-sou-avaliado",
        children: [
          { label: "Como sou avaliado", href: "/como-sou-avaliado" },
          { label: "Sistema de pontuação", href: "/sistema-pontuacao" },
        ],
      },
      { label: t("navSchools"), href: "/admin/escolas" },
      { label: t("navStudents"), href: "/admin/alunos" },
      { label: t("navAthletes"), href: "/admin/atletas" },
      { label: t("navClasses"), href: "/admin/turmas" },
      { label: t("navModalities"), href: "/admin/modalidades" },
      { label: t("navPlans"), href: "/admin/planos" },
      { label: t("navCourses"), href: "/admin/cursos" },
      { label: t("navEventsAdmin"), href: "/admin/eventos" },
      { label: t("navSettings"), href: "/admin/configuracoes" },
      { label: t("navPresence"), href: "/admin/presenca" },
      { label: t("navEvaluationCriteria"), href: "/admin/avaliacao" },
      { label: t("navMissions"), href: "/admin/missoes" },
      { label: t("navFinance"), href: "/admin/financeiro" },
      { label: t("navTrials"), href: "/admin/experimentais" },
      { label: t("navCoaches"), href: "/admin/coaches" },
      { label: t("navLeads"), href: "/admin/leads" },
    ];
  } else if (dbUser.role === "COACH") {
    sidebarTitle = t("coachTitle");
    headerExtra = <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Coach</span>;
    sidebarLinks = [
      { label: t("navHome"), href: "/coach" },
      { label: "Como sou avaliado", href: "/como-sou-avaliado" },
      { label: t("navEnterClass"), href: "/coach/aula" },
      { label: t("navWeekTheme"), href: "/coach/tema-semana" },
      { label: t("navAgenda"), href: "/coach/agenda" },
      { label: t("navStudents"), href: "/coach/alunos" },
      { label: t("navAthletesCoach"), href: "/coach/atletas" },
      { label: "Meus Cursos", href: "/coach/cursos" },
      { label: t("libraryTitle"), href: "/coach/biblioteca" },
      { label: "Financeiro", href: "/coach/financeiro" },
      { label: t("navSettings"), href: "/coach/configuracoes" },
      ...(coachStudentId ? [{ label: t("myStudentArea"), href: "/dashboard" }] : []),
    ];
  } else {
    sidebarTitle = t("studentArea");
    sidebarLinks = [
      { label: t("navHome"), href: "/dashboard" },
      { label: t("navAthleteProfile"), href: "/dashboard/performance" },
      { label: "Histórico de avaliações", href: "/dashboard/performance/historico" },
      {
        label: "Avaliação e pontuação",
        href: "/como-sou-avaliado",
        children: [
          { label: "Como sou avaliado", href: "/como-sou-avaliado" },
          { label: "Sistema de pontuação", href: "/sistema-pontuacao" },
        ],
      },
      { label: t("navConquests"), href: "/dashboard/conquistas" },
      { label: t("navStore"), href: "/dashboard/loja" },
      { label: t("navLibrary"), href: "/dashboard/biblioteca" },
      { label: t("navEvents"), href: "/dashboard/eventos" },
      { label: t("navFinance"), href: "/dashboard/financeiro" },
      { label: t("navProfile"), href: "/dashboard/perfil" },
      { label: t("onboardingReplayTour"), href: "/dashboard?replayOnboarding=1" },
    ];
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", color: "var(--text-primary)" }}>
      <ResponsiveShell
        sidebarTitle={sidebarTitle}
        sidebarLinks={sidebarLinks}
        initialTheme={theme}
        initialLocale={locale}
        headerTitle="Kingdom Fight School"
        headerExtra={headerExtra}
        logoutLabel={locale === "pt" ? "Sair" : "Logout"}
      >
        {children}
      </ResponsiveShell>
    </div>
  );
}
