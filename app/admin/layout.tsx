import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth/get-current-user";
import { getThemeFromCookies, getLocaleFromCookies } from "@/lib/theme-locale-server";
import { getTranslations } from "@/lib/i18n";
import { getAdminShellNav } from "@/lib/admin-nav-areas";
import { AdminNavSearch } from "@/components/admin/AdminNavSearch";
import { getCachedResolvedAdminAccess } from "@/lib/permissions/get-cached-resolved";
import { canAccessAdminPathname } from "@/lib/permissions/paths";
import { getKfsPathnameFromRequest } from "@/lib/server/kfs-pathname";
import { ViewAsSwitcher } from "@/components/ViewAsSwitcher";
import { ResponsiveShell } from "@/components/ResponsiveShell";
import { AdminChatWidgetGate } from "@/components/admin-chat/AdminChatWidgetGate";
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
  const { sidebarLinks: adminLinks, mobileBottomNav, searchItems } = getAdminShellNav(t, access);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", color: "var(--text-primary)" }}>
      <ResponsiveShell
        sidebarTitle="Admin"
        sidebarLinks={adminLinks}
        sidebarLead={<AdminNavSearch items={searchItems} compact />}
        initialTheme={theme}
        initialLocale={locale}
        headerTitle="KFS"
        headerAvatar={{
          href: "/admin/configuracoes",
          imageUrl: (dbUser as { avatarUrl?: string | null }).avatarUrl ?? null,
          displayName: dbUser.name,
          ariaLabel: t("headerProfileAria"),
        }}
        headerExtra={
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <CoachNotificationBell locale={locale as "pt" | "en"} />
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Admin</span>
          </div>
        }
        headerExtrasDesktopOnly={<ViewAsSwitcher />}
        mobileBottomNavSheetLead={<ViewAsSwitcher />}
        logoutLabel={locale === "pt" ? "Sair" : "Logout"}
        mainClassName="admin-main"
        mobileBottomNav={mobileBottomNav}
      >
        {children}
      </ResponsiveShell>
      <AdminChatWidgetGate />
    </div>
  );
}
