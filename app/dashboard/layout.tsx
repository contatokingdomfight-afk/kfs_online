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
import { NotificationBell } from "@/components/NotificationBell";
import { StudentOnboardingGate } from "@/components/onboarding/StudentOnboardingGate";
import { getCachedPlanAccess } from "@/lib/plan-access";
import { DashboardSplash } from "@/components/DashboardSplash";
import { buildStudentMobileBottomNav } from "@/lib/dashboard-student-mobile-nav";
import { getDashboardStudentBaseLinks } from "@/lib/dashboard-student-base-links";
import { getActiveSchoolAssistantForUserId } from "@/lib/school-assistant-coach";
import { studentHasPaymentUnlock } from "@/lib/family-payment-gate";
import { getSignupGraceState } from "@/lib/signup-grace";
import { SignupGraceReminderBanner } from "@/components/payments/SignupGraceReminderBanner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) redirect("/sign-in?reason=no-db-user");

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
  const t = getTranslations(locale as "pt" | "en");
  const supabase = await createClient();
  const [planAccess, studentRes, schoolAssistant, membershipAgreementRes] = await Promise.all([
    getCachedPlanAccess(studentId),
    studentId
      ? supabase.from("Student").select("planId, adminGrantedFullAccess").eq("id", studentId).single()
      : Promise.resolve({ data: null }),
    dbUser.role === "ALUNO" ? getActiveSchoolAssistantForUserId(supabase, dbUser.id) : Promise.resolve(null),
    studentId
      ? supabase.from("StudentMembershipAgreement").select("agreementSignedAt").eq("studentId", studentId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const hasPlan = !!studentRes.data?.planId;

  let showGraceReminder = false;
  let graceExpiresAt: string | null = null;
  if (dbUser.role === "ALUNO" && hasPlan && studentId) {
    const adminFree = Boolean((studentRes.data as { adminGrantedFullAccess?: boolean } | null)?.adminGrantedFullAccess);
    const agreementSignedAt =
      (membershipAgreementRes.data as { agreementSignedAt?: string | null } | null)?.agreementSignedAt ?? null;
    const graceState = getSignupGraceState(agreementSignedAt);
    if (!adminFree && graceState.active) {
      const hoursLeft = (new Date(graceState.expiresAt).getTime() - Date.now()) / 3_600_000;
      if (hoursLeft <= 24) {
        const coreUnlocked = await studentHasPaymentUnlock(supabase, studentId, false);
        if (!coreUnlocked) {
          showGraceReminder = true;
          graceExpiresAt = graceState.expiresAt;
        }
      }
    }
  }

  const baseLinks = getDashboardStudentBaseLinks({
    t,
    locale: locale as "pt" | "en",
    planAccess,
    hasPlan,
    hasSchoolAssistantCoach: Boolean(schoolAssistant),
  });

  const mobileBottomNav = buildStudentMobileBottomNav(baseLinks, {
    hasPlan,
    hasPerformanceTracking: planAccess.hasPerformanceTracking,
    moreLabel: locale === "pt" ? "Mais" : "More",
    wellnessLabel: locale === "pt" ? "Bem-Estar" : "Wellness",
    navHome: t("navHome"),
    navEvents: t("navEvents"),
    navTribe: t("navTribe"),
    navAthleteProfile: t("navAthleteProfile"),
    navLibrary: t("navLibrary"),
    choosePlanLabel: "✨ " + t("choosePlanTitle"),
  });

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
        headerAvatar={{
          href: "/dashboard/perfil",
          imageUrl: (dbUser as { avatarUrl?: string | null }).avatarUrl ?? null,
          displayName: dbUser.name,
          ariaLabel: t("headerProfileAria"),
        }}
        headerExtra={<NotificationBell locale={locale as "pt" | "en"} />}
        viewAsBanner={dbUser.role === "ADMIN" && viewAs === "aluno" ? <ViewAsBanner viewAs="aluno" /> : undefined}
        mainClassName="dashboard-main"
        logoutLabel={locale === "pt" ? "Sair" : "Logout"}
        mobileBottomNav={mobileBottomNav}
      >
        <DashboardSplash locale={locale} displayName={dbUser.name} />
        <SignupGraceReminderBanner
          show={showGraceReminder}
          expiresAt={graceExpiresAt}
          locale={locale as "pt" | "en"}
          body={t("signupGraceReminderBody")}
          cta={t("signupGraceReminderCta")}
          dismissLabel={t("signupGraceReminderDismiss")}
        />
        <Suspense fallback={null}>
          <StudentOnboardingGate steps={onboardingSteps} labels={onboardingLabels}>
            {children}
          </StudentOnboardingGate>
        </Suspense>
      </ResponsiveShell>
    </div>
  );
}
