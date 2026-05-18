import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCurrentCoachId } from "@/lib/auth/get-current-coach";
import { getCoachStudentId } from "@/lib/auth/get-coach-student-id";
import { getViewAsFromCookies } from "@/lib/view-as-server";
import { getThemeFromCookies, getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { ViewAsBanner } from "@/components/ViewAsBanner";
import { ResponsiveShell } from "@/components/ResponsiveShell";
import { CoachNotificationBell } from "@/components/CoachNotificationBell";
import { getKfsPathnameFromRequest } from "@/lib/server/kfs-pathname";
import { getCachedResolvedAdminAccess } from "@/lib/permissions/get-cached-resolved";
import { canAccessAdminPathname } from "@/lib/permissions/paths";
import { filterAdminLinksForAccess } from "@/lib/permissions/filter-nav";
import { getCoachShellSidebarLinks } from "@/lib/coach-sidebar-links";
import {
  buildShellMobileBottomNav,
  dedupeSidebarFlatLinks,
  flattenSidebarLinks,
} from "@/lib/shell-mobile-bottom-nav";

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

  const t = getTranslations(locale as "pt" | "en");
  const fullCoachNav = getCoachShellSidebarLinks(t, {
    showAdminEntry: dbUser.role === "ADMIN",
    coachStudentId: coachStudentId || null,
  });
  const coachLinks =
    access.kind === "granted" ? filterAdminLinksForAccess(fullCoachNav, access) : fullCoachNav;
  const flatCoach = dedupeSidebarFlatLinks(flattenSidebarLinks(coachLinks));
  const mobileBottomNav = buildShellMobileBottomNav("coach", flatCoach, locale === "pt" ? "Mais" : "More");
  const showViewAsBanner = dbUser.role === "ADMIN";

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", color: "var(--text-primary)" }}>
      <ResponsiveShell
        sidebarTitle={t("coachTitle")}
        sidebarLinks={coachLinks}
        initialTheme={theme}
        initialLocale={locale}
        headerTitle="Kingdom Fight School"
        headerAvatar={{
          href: "/coach/configuracoes",
          imageUrl: (dbUser as { avatarUrl?: string | null }).avatarUrl ?? null,
          displayName: dbUser.name,
          ariaLabel: t("headerProfileAria"),
        }}
        headerExtra={
          <>
            <CoachNotificationBell locale={locale as "pt" | "en"} />
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Coach</span>
          </>
        }
        viewAsBanner={showViewAsBanner ? <ViewAsBanner viewAs="coach" /> : undefined}
        logoutLabel={locale === "pt" ? "Sair" : "Logout"}
        mainClassName="coach-main"
        mobileBottomNav={mobileBottomNav}
      >
        {children}
      </ResponsiveShell>
    </div>
  );
}
