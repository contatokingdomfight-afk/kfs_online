"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar, type SidebarLink } from "./Sidebar";
import type { Theme, Locale } from "@/lib/theme-locale";

type Props = {
  sidebarTitle: string;
  sidebarLinks: SidebarLink[];
  initialTheme: Theme;
  initialLocale: Locale;
  headerTitle: string;
  headerExtra?: React.ReactNode;
  viewAsBanner?: React.ReactNode;
  mainClassName?: string;
  children: React.ReactNode;
};

export function ResponsiveShell({
  sidebarTitle,
  sidebarLinks,
  initialTheme,
  initialLocale,
  headerTitle,
  headerExtra,
  viewAsBanner,
  mainClassName,
  children,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setDrawerOpen(false), [pathname]);

  return (
    <div className="app-shell" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {viewAsBanner}
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Drawer (mobile) / Sidebar (desktop) */}
        <div
          className={`app-shell-drawer ${drawerOpen ? "app-shell-drawer--open" : ""}`}
          role="dialog"
          aria-label="Menu"
          aria-hidden={!drawerOpen}
        >
          <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div
              className="app-shell-drawer-header"
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600 }}>{headerTitle}</span>
            <button
              type="button"
              className="app-shell-drawer-close"
              onClick={() => setDrawerOpen(false)}
              aria-label="Fechar menu"
              style={{
                minWidth: "clamp(44px, 11vw, 48px)",
                minHeight: "clamp(44px, 11vw, 48px)",
                padding: 8,
                border: "none",
                background: "transparent",
                color: "var(--text-primary)",
                cursor: "pointer",
                fontSize: "clamp(20px, 5vw, 24px)",
                lineHeight: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>
            </div>
            <Sidebar
              title={sidebarTitle}
              links={sidebarLinks}
              initialTheme={initialTheme}
              initialLocale={initialLocale}
            />
          </div>
        </div>

        {/* Overlay when drawer open (mobile only) */}
        <div
          className={`app-shell-overlay ${drawerOpen ? "app-shell-overlay--open" : ""}`}
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />

        {/* Main area */}
        <div className="app-shell-main" style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <header
            className="app-shell-header"
            style={{
              borderBottom: "1px solid var(--border)",
              backgroundColor: "var(--bg-secondary)",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              className="app-shell-menu-btn"
              onClick={() => setDrawerOpen(true)}
              aria-label="Abrir menu"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: "clamp(44px, 11vw, 48px)",
                minHeight: "clamp(44px, 11vw, 48px)",
                width: "clamp(44px, 11vw, 48px)",
                height: "clamp(44px, 11vw, 48px)",
                padding: 0,
                border: "1px solid var(--border)",
                borderRadius: 8,
                backgroundColor: "var(--bg)",
                color: "var(--text-primary)",
                cursor: "pointer",
                flexShrink: 0,
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <svg width="clamp(20, 5vw, 24)" height="clamp(20, 5vw, 24)" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <h1 style={{ margin: 0, fontSize: "clamp(17px, 4.2vw, 20px)", fontWeight: 600, flex: 1 }}>{headerTitle}</h1>
            {headerExtra}
          </header>
          <main className={mainClassName} style={{ flex: 1, overflow: "auto", minHeight: 0 }}>{children}</main>
        </div>
      </div>
    </div>
  );
}
