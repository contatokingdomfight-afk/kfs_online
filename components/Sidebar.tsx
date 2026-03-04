import Link from "next/link";
import { ThemeLocaleSwitcher } from "@/components/ThemeLocaleSwitcher";
import { LogoutButton } from "@/components/LogoutButton";
import type { Theme } from "@/lib/theme-locale";
import type { Locale } from "@/lib/theme-locale";

export type SidebarLink = { label: string; href: string; children?: SidebarLink[] };

export function Sidebar({
  title,
  links,
  activeHref,
  initialTheme,
  initialLocale,
  logoutLabel,
}: {
  title: string;
  links: SidebarLink[];
  activeHref?: string;
  initialTheme: Theme;
  initialLocale: Locale;
  logoutLabel?: string;
}) {
  const linkStyle = (isActive: boolean) => ({
    display: "flex" as const,
    alignItems: "center" as const,
    minHeight: "clamp(44px, 11vw, 48px)",
    padding: "12px 20px",
    fontSize: "clamp(14px, 3.5vw, 16px)",
    color: isActive ? "var(--primary)" : "var(--text-primary)",
    textDecoration: "none" as const,
    fontWeight: isActive ? 600 : 500,
    backgroundColor: isActive ? "var(--bg)" : "transparent",
    borderLeft: isActive ? "4px solid var(--primary)" : "4px solid transparent",
    boxSizing: "border-box" as const,
    borderRadius: "0 var(--radius-md) var(--radius-md) 0",
  });

  return (
    <aside
      className="app-sidebar"
      style={{
        height: "100%",
        padding: "20px 0 16px",
        display: "flex",
        flexDirection: "column",
        gap: 0,
        minHeight: 0,
        overflow: "auto",
      }}
    >
      <div
        style={{
          padding: "0 20px 16px",
          borderBottom: "1px solid var(--border)",
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontSize: "clamp(11px, 2.8vw, 12px)",
            fontWeight: 700,
            color: "var(--text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {title}
        </span>
      </div>
      <nav
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          padding: "0 12px 0 0",
        }}
      >
        {links.map((item) => {
          const isParentActive = activeHref === item.href || (activeHref && item.href !== "/admin" && activeHref.startsWith(item.href));
          const hasChildren = item.children && item.children.length > 0;
          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className="app-sidebar-nav-link"
                style={linkStyle(Boolean(hasChildren ? activeHref === item.href : isParentActive))}
              >
                {item.label}
              </Link>
              {hasChildren && (
                <div style={{ paddingLeft: 20 }}>
                  {item.children!.map((child) => {
                    const isChildActive = activeHref === child.href;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="app-sidebar-nav-link"
                        style={{
                          ...linkStyle(isChildActive),
                          minHeight: 44,
                          fontSize: "clamp(13px, 3.2vw, 15px)",
                          paddingLeft: 16,
                        }}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div
        style={{
          marginTop: "auto",
          paddingTop: 16,
          borderTop: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {logoutLabel && <LogoutButton label={logoutLabel} variant="sidebar" />}
        <ThemeLocaleSwitcher initialTheme={initialTheme} initialLocale={initialLocale} variant="inline" />
      </div>
    </aside>
  );
}
