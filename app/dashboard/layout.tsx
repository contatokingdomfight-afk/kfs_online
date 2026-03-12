import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentStudentId } from "@/lib/auth/get-current-student";
import { getViewAsFromCookies } from "@/lib/view-as-server";
import { getThemeFromCookies, getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { ViewAsBanner } from "@/components/ViewAsBanner";
import { ResponsiveShell } from "@/components/ResponsiveShell";
import { StudentOnboardingGate } from "@/components/onboarding/StudentOnboardingGate";
import { getPlanAccess } from "@/lib/plan-access";

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

  const [theme, locale, studentId] = await Promise.all([
    getThemeFromCookies(),
    getLocaleFromCookies(),
    getCurrentStudentId(),
  ]);
  if (studentId) {
    const supabaseForOnboarding = await createClient();
    const { data: profile } = await supabaseForOnboarding
      .from("StudentProfile")
      .select("hasCompletedOnboarding")
      .eq("studentId", studentId)
      .maybeSingle();
    if (profile && !profile.hasCompletedOnboarding) {
      redirect("/onboarding");
    }
  }
  const t = getTranslations(locale as "pt" | "en");
  const supabase = await createClient();
  const planAccess = await getPlanAccess(supabase, studentId);
  const baseLinks = [
    { label: t("navHome"), href: "/dashboard" },
    ...(planAccess.hasPerformanceTracking
      ? [
          { label: t("navAthleteProfile"), href: "/dashboard/performance" },
          { label: "Histórico de avaliações", href: "/dashboard/performance/historico" },
        ]
      : []),
    {
      label: "Avaliação e pontuação",
      href: "/como-sou-avaliado",
      children: [
        { label: "Como sou avaliado", href: "/como-sou-avaliado" },
        { label: "Sistema de pontuação", href: "/sistema-pontuacao" },
      ],
    },
    ...(planAccess.hasPerformanceTracking ? [{ label: t("navConquests"), href: "/dashboard/conquistas" }] : []),
    ...(planAccess.hasCheckIn ? [{ label: t("navHistoricoPresencas"), href: "/dashboard/historico" }] : []),
    { label: t("navStore"), href: "/dashboard/loja" },
    { label: t("navLibrary"), href: "/dashboard/biblioteca" },
    { label: t("navEvents"), href: "/dashboard/eventos" },
    { label: t("navFinance"), href: "/dashboard/financeiro" },
    { label: t("navProfile"), href: "/dashboard/perfil" },
    ...(planAccess.hasExclusiveBenefits ? [{ label: t("navExclusiveBenefits"), href: "/dashboard/beneficios" }] : []),
    { label: t("onboardingReplayTour"), href: "/dashboard?replayOnboarding=1" },
  ];

  const onboardingSteps = [
    { title: t("onboardingWelcomeTitle"), description: t("onboardingWelcomeDesc") },
    { title: t("onboardingHomeTitle"), description: t("onboardingHomeDesc") },
    { title: t("onboardingAthleteTitle"), description: t("onboardingAthleteDesc") },
    { title: t("onboardingConquestsTitle"), description: t("onboardingConquestsDesc") },
    { title: t("onboardingStoreTitle"), description: t("onboardingStoreDesc") },
    { title: t("onboardingLibraryTitle"), description: t("onboardingLibraryDesc") },
    { title: t("onboardingEventsTitle"), description: t("onboardingEventsDesc") },
    { title: t("onboardingFinanceTitle"), description: t("onboardingFinanceDesc") },
    { title: t("onboardingProfileTitle"), description: t("onboardingProfileDesc") },
    { title: t("onboardingDoneTitle"), description: t("onboardingDoneDesc") },
  ];

  const onboardingLabels = {
    next: t("onboardingNext"),
    back: t("onboardingBack"),
    skip: t("onboardingSkip"),
    start: t("onboardingStart"),
  };

  return (
    <div data-dashboard style={{ minHeight: "100vh", backgroundColor: "var(--bg)", color: "var(--text-primary)" }}>
      <ResponsiveShell
        sidebarTitle={t("studentArea")}
        sidebarLinks={baseLinks}
        initialTheme={theme}
        initialLocale={locale}
        headerTitle="Kingdom Fight School"
        viewAsBanner={dbUser.role === "ADMIN" && viewAs === "aluno" ? <ViewAsBanner viewAs="aluno" /> : undefined}
        mainClassName="dashboard-main"
        logoutLabel={locale === "pt" ? "Sair" : "Logout"}
      >
        <Suspense fallback={null}>
          <StudentOnboardingGate steps={onboardingSteps} labels={onboardingLabels}>
            {children}
          </StudentOnboardingGate>
        </Suspense>
      </ResponsiveShell>
    </div>
  );
}
