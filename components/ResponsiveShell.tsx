"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
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
  logoutLabel?: string;
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
  logoutLabel,
  children,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(true); // assume mobile até hidratar (evita sidebar clicável antes do JS)
  const pathname = usePathname();
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    const onMatch = () => setIsMobile(!mql.matches);
    onMatch();
    mql.addEventListener("change", onMatch);
    return () => mql.removeEventListener("change", onMatch);
  }, []);

  const closeDrawer = () => {
    setDrawerOpen(false);
    menuBtnRef.current?.focus({ preventScroll: true });
  };

  useEffect(() => {
    setDrawerOpen(false);
    const t = setTimeout(() => menuBtnRef.current?.focus({ preventScroll: true }), 0);
    return () => clearTimeout(t);
  }, [pathname]);

  // Só usar inert no mobile quando o drawer estiver fechado. No desktop o sidebar fica sempre clicável.
  useLayoutEffect(() => {
    const el = drawerRef.current;
    if (!el) return;
    const shouldBeInert = isMobile && !drawerOpen;
    if (shouldBeInert) el.setAttribute("inert", "");
    else el.removeAttribute("inert");
  }, [drawerOpen, isMobile]);

  return (
    <div className="app-shell" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {viewAsBanner}
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Drawer (mobile) / Sidebar (desktop) */}
        <div
          ref={drawerRef}
          className={`app-shell-drawer ${drawerOpen ? "app-shell-drawer--open" : ""}`}
          role="dialog"
          aria-label="Menu"
          aria-modal={drawerOpen}
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
              onClick={closeDrawer}
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
              activeHref={pathname}
              initialTheme={initialTheme}
              initialLocale={initialLocale}
              logoutLabel={logoutLabel}
            />
          </div>
        </div>

        {/* Overlay when drawer open (mobile only) */}
        <div
          className={`app-shell-overlay ${drawerOpen ? "app-shell-overlay--open" : ""}`}
          onClick={closeDrawer}
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
              ref={menuBtnRef}
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
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: "clamp(20px, 5vw, 24px)", height: "clamp(20px, 5vw, 24px)" }}>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <h1 style={{ margin: 0, fontSize: "clamp(17px, 4.2vw, 20px)", fontWeight: 600, flex: 1 }}>{headerTitle}</h1>
            {headerExtra}
          </header>
          <main className={mainClassName} style={{ flex: 1, overflow: "auto", minHeight: 0, minWidth: 0 }}>{children}</main>
        </div>
      </div>
    </div>
  );
}
