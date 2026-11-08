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
import { getSchoolScope } from "@/lib/school-scope";
import { SchoolPicker, SchoolBadge } from "@/components/admin/SchoolPicker";
import { LogoutButton } from "@/components/LogoutButton";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dbUser = await getCurrentDbUser();
  if (!dbUser) redirect("/sign-in");
  if (dbUser.role !== "ADMIN") redirect("/dashboard");

  const [access, scope] = await Promise.all([getCachedResolvedAdminAccess(), getSchoolScope()]);
  // Diretor sem escola atribuída não tem o que gerir. Não redirecionar para /dashboard:
  // o layout do dashboard devolve o ADMIN para /admin → loop infinito de redirects.
  if (scope.kind === "none") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "var(--bg)", color: "var(--text-primary)" }}>
        <div style={{ maxWidth: 420, textAlign: "center", display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
          <h1 style={{ fontSize: 20, margin: 0 }}>Sem escola atribuída</h1>
          <p style={{ margin: 0, color: "var(--text-secondary)" }}>
            A tua conta é de administrador, mas ainda não tem nenhuma escola associada. Pede ao Admin Geral para te
            atribuir uma escola (ou acesso a toda a rede).
          </p>
          <LogoutButton label="Sair" variant="button" />
        </div>
      </div>
    );
  }
  const kfsPath = await getKfsPathnameFromRequest();
  if (access.kind === "granted" && kfsPath && !canAccessAdminPathname(access, kfsPath)) {
    redirect("/admin");
  }

  const [theme, locale] = await Promise.all([getThemeFromCookies(), getLocaleFromCookies()]);
  const t = getTranslations(locale as "pt" | "en");
  const { sidebarLinks: adminLinks, mobileBottomNav, searchItems } = getAdminShellNav(t, access, scope.kind === "network");

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
            {scope.schools.length > 1 ? (
              <SchoolPicker schools={scope.schools} selectedSchoolId={scope.selectedSchoolId} allowAll={scope.kind === "network"} />
            ) : scope.kind === "school" ? (
              <SchoolBadge name={scope.schools[0].name} />
            ) : null}
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
