import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getCoachStudentId } from "@/lib/auth/get-coach-student-id";
import { getViewAsFromCookies } from "@/lib/view-as-server";
import { getThemeFromCookies, getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { ViewAsSwitcher } from "@/components/ViewAsSwitcher";
import { ResponsiveShell } from "@/components/ResponsiveShell";
import type { MobileAppBottomNavConfig } from "@/components/MobileAppBottomNav";
import type { SidebarLink } from "@/components/Sidebar";
import { getAdminBackofficeSidebarLinks } from "@/lib/admin-sidebar-links";
import { getCachedResolvedAdminAccess } from "@/lib/permissions/get-cached-resolved";
import { canAccessAdminPathname } from "@/lib/permissions/paths";
import { filterAdminLinksForAccess } from "@/lib/permissions/filter-nav";
import { getKfsPathnameFromRequest } from "@/lib/server/kfs-pathname";
import { getCoachShellSidebarLinks } from "@/lib/coach-sidebar-links";
import { EvaluationDocsTabs } from "@/components/evaluation-docs/EvaluationDocsTabs";
import { getEvaluationDocsStudentShellLinks } from "@/lib/sidebar-evaluation-docs-shell";
import { NotificationBell } from "@/components/NotificationBell";
import { getStudentMobileBottomNavConfig } from "@/lib/dashboard-student-mobile-nav";
import {
  buildShellMobileBottomNav,
  dedupeSidebarFlatLinks,
  flattenSidebarLinks,
} from "@/lib/shell-mobile-bottom-nav";
import { CoachNotificationBell } from "@/components/CoachNotificationBell";

export default async function SistemaPontuacaoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) redirect("/sign-in");

  const [theme, locale, coachStudentId, viewAs] = await Promise.all([
    getThemeFromCookies(),
    getLocaleFromCookies(),
    dbUser.role === "COACH" || dbUser.role === "ADMIN" ? getCoachStudentId() : Promise.resolve(null),
    dbUser.role === "ADMIN" ? getViewAsFromCookies() : Promise.resolve(null),
  ]);
  const t = getTranslations(locale as "pt" | "en");

  let sidebarTitle: string;
  let sidebarLinks: SidebarLink[];
  let headerExtra: React.ReactNode = null;
  let mainShellClass: string | undefined;
  let mobileBottomNav: MobileAppBottomNavConfig | null = null;
  let headerAvatar:
    | { href: string; imageUrl: string | null; displayName: string | null; ariaLabel: string }
    | undefined;

  /** Admin com "Ver como: Professor" deve navegar como coach aqui também — não só dentro de /coach. */
  const isAdminViewingAsCoach = dbUser.role === "ADMIN" && viewAs === "coach";
  const isRealAdmin = dbUser.role === "ADMIN" && !isAdminViewingAsCoach && viewAs !== "aluno";

  if (isRealAdmin) {
    const access = await getCachedResolvedAdminAccess();
    const kfsPath = await getKfsPathnameFromRequest();
    if (access.kind === "granted" && kfsPath && !canAccessAdminPathname(access, kfsPath)) {
      redirect("/admin");
    }
    sidebarTitle = "Admin";
    headerExtra = (
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <CoachNotificationBell locale={locale as "pt" | "en"} />
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Admin</span>
      </div>
    );
    const full = getAdminBackofficeSidebarLinks(t);
    sidebarLinks = access.kind === "granted" ? filterAdminLinksForAccess(full, access) : full;
    const flatAd = dedupeSidebarFlatLinks(flattenSidebarLinks(sidebarLinks));
    mobileBottomNav = buildShellMobileBottomNav("admin", flatAd, locale === "pt" ? "Mais" : "More");
    mainShellClass = "admin-main";
    headerAvatar = {
      href: "/admin/configuracoes",
      imageUrl: (dbUser as { avatarUrl?: string | null }).avatarUrl ?? null,
      displayName: dbUser.name,
      ariaLabel: t("headerProfileAria"),
    };
  } else if (dbUser.role === "COACH" || isAdminViewingAsCoach) {
    const access = await getCachedResolvedAdminAccess();
    const kfsPath = await getKfsPathnameFromRequest();
    if (access.kind === "granted" && kfsPath && !canAccessAdminPathname(access, kfsPath)) {
      redirect("/coach");
    }
    sidebarTitle = t("coachTitle");
    headerExtra = (
      <>
        <CoachNotificationBell locale={locale as "pt" | "en"} />
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Coach</span>
      </>
    );
    const full = getCoachShellSidebarLinks(t, {
      showAdminEntry: dbUser.role === "ADMIN",
      coachStudentId: coachStudentId || null,
    });
    sidebarLinks = access.kind === "granted" ? filterAdminLinksForAccess(full, access) : full;
    const flatCh = dedupeSidebarFlatLinks(flattenSidebarLinks(sidebarLinks));
    mobileBottomNav = buildShellMobileBottomNav("coach", flatCh, locale === "pt" ? "Mais" : "More");
    mainShellClass = "coach-main";
    headerAvatar = {
      href: "/coach/configuracoes",
      imageUrl: (dbUser as { avatarUrl?: string | null }).avatarUrl ?? null,
      displayName: dbUser.name,
      ariaLabel: t("headerProfileAria"),
    };
  } else {
    sidebarTitle = t("studentArea");
    sidebarLinks = getEvaluationDocsStudentShellLinks(t);
    mobileBottomNav = await getStudentMobileBottomNavConfig(locale as "pt" | "en", t);
    mainShellClass = "dashboard-main";
    headerAvatar = {
      href: "/dashboard/perfil",
      imageUrl: (dbUser as { avatarUrl?: string | null }).avatarUrl ?? null,
      displayName: dbUser.name,
      ariaLabel: t("headerProfileAria"),
    };
    headerExtra = <NotificationBell locale={locale as "pt" | "en"} />;
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
        headerExtrasDesktopOnly={<ViewAsSwitcher />}
        mobileBottomNavSheetLead={<ViewAsSwitcher />}
        headerAvatar={headerAvatar}
        logoutLabel={locale === "pt" ? "Sair" : "Logout"}
        mainClassName={mainShellClass}
        mobileBottomNav={mobileBottomNav}
      >
        <div style={{ maxWidth: "min(640px, 100%)", margin: "0 auto", padding: "0 clamp(16px, 4vw, 24px)" }}>
          <EvaluationDocsTabs
            labelComo={t("evalDocsTabHow")}
            labelSistema={t("evalDocsTabScoring")}
            ariaLabel={t("evalDocsTabsAria")}
          />
        </div>
        {children}
      </ResponsiveShell>
    </div>
  );
}
