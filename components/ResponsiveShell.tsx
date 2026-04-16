"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sidebar, type SidebarLink } from "./Sidebar";
import type { Theme, Locale } from "@/lib/theme-locale";

const SCROLL_DELTA = 8;

function headerAvatarInitials(name: string | null): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type Props = {
  sidebarTitle: string;
  sidebarLinks: SidebarLink[];
  initialTheme: Theme;
  initialLocale: Locale;
  headerTitle: string;
  headerExtra?: React.ReactNode;
  /** Miniatura no canto (link para o ecrã de perfil / definições). */
  headerAvatar?: {
    href: string;
    imageUrl: string | null;
    displayName: string | null;
    ariaLabel: string;
  };
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
  headerAvatar,
  viewAsBanner,
  mainClassName,
  logoutLabel,
  children,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(true); // assume mobile até hidratar (evita sidebar clicável antes do JS)
  /** Só mobile (<768px): esconde ao scroll para baixo no main; ao subir, mostra já (sem transição). */
  const [headerHidden, setHeaderHidden] = useState(false);
  const [mobileHeaderHeight, setMobileHeaderHeight] = useState(56);
  const pathname = usePathname();
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const lastScrollTopRef = useRef(0);

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

  useEffect(() => {
    if (drawerOpen) setHeaderHidden(false);
  }, [drawerOpen]);

  useLayoutEffect(() => {
    if (!isMobile || !headerRef.current) return;
    setMobileHeaderHeight(headerRef.current.offsetHeight);
  }, [isMobile, pathname, drawerOpen, headerHidden]);

  const onMainScroll = useCallback(() => {
    if (!isMobile) return;
    const el = mainRef.current;
    if (!el) return;
    const y = Math.max(0, el.scrollTop);
    const prev = lastScrollTopRef.current;
    const delta = y - prev;
    lastScrollTopRef.current = y;

    if (y < SCROLL_DELTA) {
      setHeaderHidden(false);
      return;
    }
    if (delta > SCROLL_DELTA) setHeaderHidden(true);
    else if (delta < -SCROLL_DELTA) setHeaderHidden(false);
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile) {
      setHeaderHidden(false);
      return;
    }
    const el = mainRef.current;
    if (!el) return;
    lastScrollTopRef.current = el.scrollTop;
    el.addEventListener("scroll", onMainScroll, { passive: true });
    return () => el.removeEventListener("scroll", onMainScroll);
  }, [isMobile, onMainScroll, pathname]);

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
      <div className="app-shell-inner">
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
        <div
          className="app-shell-main"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            ...(isMobile ? { position: "relative" as const } : {}),
          }}
        >
          <header
            ref={headerRef}
            className="app-shell-header"
            style={{
              borderBottom: "1px solid var(--border)",
              backgroundColor: "var(--bg-secondary)",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexShrink: 0,
              ...(isMobile
                ? {
                    position: "absolute" as const,
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 25,
                    transform: headerHidden ? "translateY(-100%)" : "translateY(0)",
                    transition: headerHidden ? "transform 0.2s ease-out" : "none",
                    pointerEvents: headerHidden ? ("none" as const) : ("auto" as const),
                    willChange: "transform",
                  }
                : {}),
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
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {headerAvatar && (
                <Link
                  href={headerAvatar.href}
                  aria-label={headerAvatar.ariaLabel}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    border: "1px solid var(--border)",
                    overflow: "hidden",
                    flexShrink: 0,
                    background: "var(--bg-secondary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    textDecoration: "none",
                  }}
                >
                  {headerAvatar.imageUrl?.trim() ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={headerAvatar.imageUrl}
                      alt=""
                      width={36}
                      height={36}
                      style={{ objectFit: "cover", width: "100%", height: "100%" }}
                    />
                  ) : (
                    headerAvatarInitials(headerAvatar.displayName)
                  )}
                </Link>
              )}
              {headerExtra}
            </div>
          </header>
          <main
            ref={mainRef}
            className={mainClassName}
            style={{
              flex: 1,
              overflow: "auto",
              minHeight: 0,
              minWidth: 0,
              ...(isMobile
                ? {
                    paddingTop: headerHidden ? undefined : mobileHeaderHeight,
                  }
                : {}),
            }}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
