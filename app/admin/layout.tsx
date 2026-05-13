import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getThemeFromCookies, getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { getAdminBackofficeSidebarLinks } from "@/lib/admin-sidebar-links";
import { getCachedResolvedAdminAccess } from "@/lib/permissions/get-cached-resolved";
import { canAccessAdminPathname } from "@/lib/permissions/paths";
import { filterAdminLinksForAccess } from "@/lib/permissions/filter-nav";
import { getKfsPathnameFromRequest } from "@/lib/server/kfs-pathname";
import { ViewAsSwitcher } from "@/components/ViewAsSwitcher";
import { ResponsiveShell } from "@/components/ResponsiveShell";
import { CoachNotificationBell } from "@/components/CoachNotificationBell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) redirect("/sign-in");
  if (dbUser.role !== "ADMIN") redirect("/dashboard");

  const access = await getCachedResolvedAdminAccess();
  const kfsPath = await getKfsPathnameFromRequest();
  if (access.kind === "granted" && kfsPath && !canAccessAdminPathname(access, kfsPath)) {
    redirect("/admin");
  }

  const [theme, locale] = await Promise.all([getThemeFromCookies(), getLocaleFromCookies()]);
  const t = getTranslations(locale as "pt" | "en");
  const full = getAdminBackofficeSidebarLinks(t);
  const adminLinks =
    access.kind === "granted" ? filterAdminLinksForAccess(full, access) : full;

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
            <CoachNotificationBell locale={locale as "pt" | "en"} />
            <ViewAsSwitcher />
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Admin</span>
          </div>
        }
        logoutLabel={locale === "pt" ? "Sair" : "Logout"}
        mainClassName="admin-main"
      >
        {children}
      </ResponsiveShell>
    </div>
  );
}
