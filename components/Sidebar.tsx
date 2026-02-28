import Link from "next/link";
import { ThemeLocaleSwitcher } from "@/components/ThemeLocaleSwitcher";
import type { Theme } from "@/lib/theme-locale";
import type { Locale } from "@/lib/theme-locale";

export type SidebarLink = { label: string; href: string };

export function Sidebar({
  title,
  links,
  activeHref,
  initialTheme,
  initialLocale,
}: {
  title: string;
  links: SidebarLink[];
  activeHref?: string;
  initialTheme: Theme;
  initialLocale: Locale;
}) {
  return (
    <aside
      className="app-sidebar"
      style={{
        height: "100%",
        padding: "16px 0",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        minHeight: 0,
        overflow: "auto",
      }}
    >
      <div style={{ padding: "0 clamp(14px, 3.5vw, 16px) clamp(12px, 3vw, 14px)", borderBottom: "1px solid var(--border)", marginBottom: 8 }}>
        <span style={{ fontSize: "clamp(12px, 3vw, 13px)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {title}
        </span>
      </div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minHeight: 0, overflow: "auto" }}>
        {links.map(({ label, href }) => {
          const isActive = activeHref === href;
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                minHeight: "clamp(44px, 11vw, 50px)",
                padding: "clamp(10px, 2.5vw, 12px) clamp(14px, 3.5vw, 16px)",
                fontSize: "clamp(15px, 3.8vw, 17px)",
                color: isActive ? "var(--primary)" : "var(--text-primary)",
                textDecoration: "none",
                fontWeight: isActive ? 600 : 500,
                backgroundColor: isActive ? "var(--bg)" : "transparent",
                borderLeft: isActive ? "3px solid var(--primary)" : "3px solid transparent",
                boxSizing: "border-box",
              }}
            >
              {label}
            </Link>
          );
        })}
      </nav>
      <ThemeLocaleSwitcher initialTheme={initialTheme} initialLocale={initialLocale} variant="inline" />
    </aside>
  );
}
