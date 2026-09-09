import Link from "next/link";
import { ThemeLocaleSwitcher } from "@/components/ThemeLocaleSwitcher";
import { LogoutButton } from "@/components/LogoutButton";
import { SidebarPwaInstall } from "@/components/SidebarPwaInstall";
import type { Theme } from "@/lib/theme-locale";
import type { Locale } from "@/lib/theme-locale";

export type SidebarLink = {
  label: string;
  href: string;
  prefetch?: boolean;
  children?: SidebarLink[];
  /** Sem `children`: considerar activo se `activeHref` for igual a algum destes prefixos (exact ou sub-rota). */
  groupActiveHrefs?: string[];
  /** Ícone opcional (emoji) mostrado antes do label. */
  icon?: string;
  /**
   * Nome da secção a que este link pertence (ex.: "Pessoas", "Académico"). Links consecutivos
   * com a mesma secção partilham um cabeçalho; links sem `section` não mostram cabeçalho algum.
   */
  section?: string;
};

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
        overflow: "hidden",
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
        {links.map((item, idx) => {
          const hasChildren = item.children && item.children.length > 0;
          const previousSection = idx > 0 ? links[idx - 1].section : undefined;
          const showSectionHeader = !!item.section && item.section !== previousSection;
          // Sem filhos: URL exacta, ou `groupActiveHrefs` se definido. Com filhos: item, prefixo do item, ou qualquer filho.
          const navHighlighted = (() => {
            if (!activeHref) return false;
            if (hasChildren) {
              return (
                activeHref === item.href ||
                activeHref.startsWith(`${item.href}/`) ||
                item.children!.some((c) => activeHref === c.href || activeHref.startsWith(`${c.href}/`))
              );
            }
            const group = item.groupActiveHrefs;
            if (group?.length) {
              return group.some((h) => activeHref === h || activeHref.startsWith(`${h}/`));
            }
            return activeHref === item.href;
          })();
          return (
            <div key={item.href}>
              {showSectionHeader && (
                <div
                  style={{
                    padding: idx === 0 ? "0 20px 6px" : "16px 20px 6px",
                    fontSize: "clamp(10px, 2.6vw, 11px)",
                    fontWeight: 700,
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {item.section}
                </div>
              )}
              <Link
                href={item.href}
                prefetch={item.prefetch}
                className="app-sidebar-nav-link"
                style={linkStyle(navHighlighted)}
              >
                {item.icon && (
                  <span aria-hidden="true" style={{ marginRight: 10, fontSize: "1.05em" }}>
                    {item.icon}
                  </span>
                )}
                {item.label}
              </Link>
              {hasChildren && (
                <div style={{ paddingLeft: 20 }}>
                  {item.children!.map((child, childIdx) => {
                    const isChildActive =
                      !!activeHref && (activeHref === child.href || activeHref.startsWith(`${child.href}/`));
                    return (
                      <Link
                        key={`${child.href}-${childIdx}`}
                        href={child.href}
                        prefetch={child.prefetch}
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
        className="app-sidebar-footer"
        style={{
          marginTop: "auto",
          flexShrink: 0,
          paddingTop: 16,
          borderTop: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          backgroundColor: "var(--bg-secondary)",
        }}
      >
        <SidebarPwaInstall locale={initialLocale} />
        {logoutLabel && <LogoutButton label={logoutLabel} variant="sidebar" />}
        <ThemeLocaleSwitcher initialTheme={initialTheme} initialLocale={initialLocale} variant="inline" />
      </div>
    </aside>
  );
}
