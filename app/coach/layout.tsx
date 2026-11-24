import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentCoachId } from "@/lib/auth/get-current-coach";
import { getCurrentCoachOnboarding } from "@/lib/coach-onboarding";
import { getCoachStudentId } from "@/lib/auth/get-coach-student-id";
import { getViewAsFromCookies } from "@/lib/view-as-server";
import { getThemeFromCookies, getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { ViewAsBanner } from "@/components/ViewAsBanner";
import { DemoModeBanner } from "@/components/DemoModeBanner";
import { isDemoEmail } from "@/lib/demo";
import { ResponsiveShell } from "@/components/ResponsiveShell";
import { CoachNotificationBell } from "@/components/CoachNotificationBell";
import { getKfsPathnameFromRequest } from "@/lib/server/kfs-pathname";
import { getCachedResolvedAdminAccess } from "@/lib/permissions/get-cached-resolved";
import { canAccessAdminPathname } from "@/lib/permissions/paths";
import { getCoachMobileBottomNav, getCoachShellSidebarLinks } from "@/lib/coach-sidebar-links";
import { createClient } from "@/lib/supabase/server";
import { getActiveSchoolAssistantForUserId, isSchoolAssistantCoachPathAllowed } from "@/lib/school-assistant-coach";

export default async function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) redirect("/sign-in");

  const supabaseForAssistant = await createClient();
  const schoolAssistant =
    dbUser.role === "ALUNO" ? await getActiveSchoolAssistantForUserId(supabaseForAssistant, dbUser.id) : null;
  const isSchoolAssistant = Boolean(schoolAssistant);

  if (dbUser.role !== "COACH" && dbUser.role !== "ADMIN" && !isSchoolAssistant) redirect("/dashboard");

  let showCoachAdesaoNotice = false;
  if (dbUser.role === "COACH") {
    const coachId = await getCurrentCoachId();
    if (!coachId) redirect("/dashboard?message=coach-access-revoked");
    // Professor que entrou pelo pedido de acesso: só usa a área do coach depois de assinar o contrato.
    // Professores antigos (criados pelo admin) veem só um aviso, para não ficarem bloqueados de repente.
    const onboarding = await getCurrentCoachOnboarding(dbUser.id);
    if (onboarding && !onboarding.complete) {
      if (onboarding.approvedViaRequest) redirect("/professor/adesao");
      showCoachAdesaoNotice = true;
    }
  }

  const [viewAs, theme, locale, coachStudentId, access, kfsPath] = await Promise.all([
    dbUser.role === "ADMIN" ? getViewAsFromCookies() : Promise.resolve(null),
    getThemeFromCookies(),
    getLocaleFromCookies(),
    getCoachStudentId(),
    getCachedResolvedAdminAccess(),
    getKfsPathnameFromRequest(),
  ]);

  if (access.kind === "granted" && kfsPath && !canAccessAdminPathname(access, kfsPath)) {
    redirect("/coach");
  }

  if (isSchoolAssistant && kfsPath && !isSchoolAssistantCoachPathAllowed(kfsPath)) {
    redirect("/coach");
  }

  const t = getTranslations(locale as "pt" | "en");
  const navOptions = { showAdminEntry: dbUser.role === "ADMIN", coachStudentId: coachStudentId || null, isSchoolAssistant };
  const coachLinks = getCoachShellSidebarLinks(t, navOptions, access);
  const mobileBottomNav = getCoachMobileBottomNav(t, navOptions, access);
  const showViewAsBanner = dbUser.role === "ADMIN";

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", color: "var(--text-primary)" }}>
      <ResponsiveShell
        sidebarTitle={t("coachTitle")}
        sidebarLinks={coachLinks}
        initialTheme={theme}
        initialLocale={locale}
        headerTitle="PM Team"
        headerAvatar={{
          href: "/coach/configuracoes",
          imageUrl: (dbUser as { avatarUrl?: string | null }).avatarUrl ?? null,
          displayName: dbUser.name,
          ariaLabel: t("headerProfileAria"),
        }}
        headerExtra={
          <>
            <CoachNotificationBell locale={locale as "pt" | "en"} />
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {isSchoolAssistant ? "Assistente" : "Coach"}
            </span>
          </>
        }
        viewAsBanner={
          isDemoEmail(dbUser.email) ? (
            <DemoModeBanner role="professor" />
          ) : showViewAsBanner ? (
            <ViewAsBanner viewAs="coach" />
          ) : undefined
        }
        logoutLabel={locale === "pt" ? "Sair" : "Logout"}
        mainClassName="coach-main"
        mobileBottomNav={mobileBottomNav}
      >
        {showCoachAdesaoNotice && (
          <div
            className="card"
            style={{ padding: "12px 14px", marginBottom: 16, borderLeft: "3px solid var(--primary)", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}
          >
            <span style={{ flex: "1 1 240px", fontSize: 14 }}>
              Falta preencheres os teus dados e assinares o contrato de professor.
            </span>
            <a href="/professor/adesao" className="btn btn-primary" style={{ textDecoration: "none" }}>
              Assinar agora
            </a>
          </div>
        )}
        {children}
      </ResponsiveShell>
    </div>
  );
}
