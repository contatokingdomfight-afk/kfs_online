"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export type MobileNavIconId =
  | "home"
  | "heart"
  | "book"
  | "calendar"
  | "chart"
  | "scale"
  | "trophy"
  | "medal"
  | "clock"
  | "shopping"
  | "credit"
  | "user"
  | "file"
  | "star"
  | "sparkles"
  | "more";

export type MobileAppBottomNavItem = {
  label: string;
  href: string;
  icon: MobileNavIconId;
  prefetch?: boolean;
  groupActiveHrefs?: string[];
};

export type MobileAppBottomNavConfig = {
  primary: [MobileAppBottomNavItem, MobileAppBottomNavItem, MobileAppBottomNavItem, MobileAppBottomNavItem];
  overflow: MobileAppBottomNavItem[];
  moreLabel: string;
};

const BAR_Z = 20_000;
const BACKDROP_Z = 20_400;
const SHEET_Z = 20_500;

function pathMatchesItem(activePath: string, item: MobileAppBottomNavItem): boolean {
  const group = item.groupActiveHrefs;
  if (group?.length) {
    return group.some((h) => activePath === h || activePath.startsWith(`${h}/`));
  }
  if (item.href.includes("?")) {
    const [path] = item.href.split("?");
    return activePath === path || activePath.startsWith(`${path}/`);
  }
  return activePath === item.href || activePath.startsWith(`${item.href}/`);
}

function isReplayOnboardingHref(href: string): boolean {
  return href.includes("replayOnboarding=1");
}

function NavIcon({ id, active }: { id: MobileNavIconId; active: boolean }) {
  const c = active ? "var(--primary)" : "var(--text-secondary)";
  const s = { width: 22, height: 22, flexShrink: 0 } as const;
  switch (id) {
    case "home":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" style={s}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 10v10h14V10" />
        </svg>
      );
    case "heart":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" style={s}>
          <path d="M12 21s-7-4.35-9-8.5a5.5 5.5 0 0 1 9.87-3.5A5.5 5.5 0 0 1 21 12.5C19 16.65 12 21 12 21z" />
        </svg>
      );
    case "book":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" style={s}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeLinecap="round" />
        </svg>
      );
    case "calendar":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" style={s}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeLinecap="round" />
          <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
        </svg>
      );
    case "chart":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" style={s}>
          <path d="M3 3v18h18" strokeLinecap="round" />
          <path d="m7 12 4-4 4 4 6-6" strokeLinecap="round" />
        </svg>
      );
    case "scale":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" style={s}>
          <path d="M12 3a3 3 0 0 0-3 3v6h6V6a3 3 0 0 0-3-3z" strokeLinecap="round" />
          <path d="M19 21H5M7 21v-4h10v4" strokeLinecap="round" />
        </svg>
      );
    case "trophy":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" style={s}>
          <path d="M8 21h8M12 17v4M6 3h12v4a4 4 0 0 1-8 0V3z" strokeLinecap="round" />
          <path d="M6 7H4a2 2 0 0 0 2 2M18 7h2a2 2 0 0 1-2 2" strokeLinecap="round" />
        </svg>
      );
    case "medal":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" style={s}>
          <circle cx="12" cy="9" r="6" />
          <path d="M8.5 14.5 6 22M15.5 14.5 18 22" strokeLinecap="round" />
        </svg>
      );
    case "clock":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" style={s}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" strokeLinecap="round" />
        </svg>
      );
    case "shopping":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" style={s}>
          <circle cx="9" cy="20" r="1" />
          <circle cx="17" cy="20" r="1" />
          <path d="M3 3h2l2 14h12l2-9H6" strokeLinecap="round" />
        </svg>
      );
    case "credit":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" style={s}>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
        </svg>
      );
    case "user":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" style={s}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" strokeLinecap="round" />
        </svg>
      );
    case "file":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" style={s}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" />
          <path d="M14 2v6h6M10 13h4M10 17h4" strokeLinecap="round" />
        </svg>
      );
    case "star":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" style={s}>
          <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7L12 17.8 5.7 21 8 13.6 2 9.4h7.6z" strokeLinejoin="round" />
        </svg>
      );
    case "sparkles":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" style={s}>
          <path d="M9 11 12 2l3 9 9 3-9 3-3 9-3-9-9-3z" strokeLinejoin="round" />
        </svg>
      );
    case "more":
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" style={s}>
          <circle cx="5" cy="12" r="1.5" fill={c} stroke="none" />
          <circle cx="12" cy="12" r="1.5" fill={c} stroke="none" />
          <circle cx="19" cy="12" r="1.5" fill={c} stroke="none" />
        </svg>
      );
  }
}

export function MobileAppBottomNav({
  config,
  sheetFooter,
}: {
  config: MobileAppBottomNavConfig;
  /** Tema, idioma, sair, PWA — quando o hamburger está oculto. */
  sheetFooter?: ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const moreBtnRef = useRef<HTMLButtonElement>(null);

  const itemActive = useCallback(
    (item: MobileAppBottomNavItem): boolean => {
      if (isReplayOnboardingHref(item.href)) {
        return pathname === "/dashboard" && searchParams.get("replayOnboarding") === "1";
      }
      if (item.href === "/dashboard") {
        if (searchParams.get("replayOnboarding") === "1") return false;
        return pathname === "/dashboard";
      }
      return pathMatchesItem(pathname, item);
    },
    [pathname, searchParams]
  );

  const overflowActive = config.overflow.some((item) => itemActive(item));

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    moreBtnRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSheet();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen, closeSheet]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    closeSheet();
  }, [pathname, closeSheet]);

  const portalContent = (
    <>
      <nav
        aria-label="Menu inferior"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: BAR_Z,
          display: "flex",
          alignItems: "stretch",
          justifyContent: "space-around",
          gap: 0,
          paddingBottom: "max(6px, env(safe-area-inset-bottom, 0px))",
          paddingTop: 6,
          paddingLeft: "max(4px, env(safe-area-inset-left, 0px))",
          paddingRight: "max(4px, env(safe-area-inset-right, 0px))",
          backgroundColor: "var(--bg-secondary)",
          borderTop: "1px solid var(--border)",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.12)",
        }}
      >
        {config.primary.map((item) => {
          const active = itemActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={item.prefetch}
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                padding: "6px 4px 8px",
                textDecoration: "none",
                color: active ? "var(--primary)" : "var(--text-secondary)",
                fontWeight: active ? 600 : 500,
                fontSize: 10,
                lineHeight: 1.15,
                textAlign: "center",
                WebkitTapHighlightColor: "transparent",
              }}
              aria-current={active ? "page" : undefined}
            >
              <NavIcon id={item.icon} active={active} />
              <span style={{ maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.label}
              </span>
            </Link>
          );
        })}
        <button
          ref={moreBtnRef}
          type="button"
          onClick={() => setSheetOpen((o) => !o)}
          aria-expanded={sheetOpen}
          aria-controls="mobile-app-bottom-more"
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            padding: "6px 4px 8px",
            border: "none",
            background: overflowActive && !sheetOpen ? "var(--bg)" : "transparent",
            color: sheetOpen || overflowActive ? "var(--primary)" : "var(--text-secondary)",
            fontWeight: sheetOpen || overflowActive ? 600 : 500,
            fontSize: 10,
            cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <NavIcon id="more" active={sheetOpen || overflowActive} />
          <span>{config.moreLabel}</span>
        </button>
      </nav>

      {sheetOpen ? (
        <>
          <button
            type="button"
            aria-label="Fechar"
            onClick={(e) => {
              e.preventDefault();
              closeSheet();
            }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: BACKDROP_Z,
              border: "none",
              padding: 0,
              margin: 0,
              background: "rgba(0,0,0,0.5)",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
            }}
          />
          <div
            id="mobile-app-bottom-more"
            role="dialog"
            aria-modal="true"
            aria-label={config.moreLabel}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: SHEET_Z,
              maxHeight: "min(72vh, 520px)",
              backgroundColor: "var(--bg-secondary)",
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              border: "1px solid var(--border)",
              borderBottom: "none",
              paddingLeft: "max(16px, env(safe-area-inset-left, 0px))",
              paddingRight: "max(16px, env(safe-area-inset-right, 0px))",
              paddingBottom: 0,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              boxShadow: "0 -8px 32px rgba(0,0,0,0.25)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexShrink: 0,
                paddingTop: 8,
                paddingBottom: 8,
              }}
            >
              <span style={{ fontWeight: 600, fontSize: "clamp(16px, 4vw, 18px)", color: "var(--text-primary)" }}>
                {config.moreLabel}
              </span>
              <button
                type="button"
                onClick={closeSheet}
                aria-label="Fechar"
                style={{
                  minWidth: 44,
                  minHeight: 44,
                  padding: 0,
                  border: "none",
                  borderRadius: 8,
                  background: "var(--bg)",
                  color: "var(--text-primary)",
                  fontSize: 22,
                  lineHeight: 1,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                ✕
              </button>
            </div>
            <div
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                background: "var(--border)",
                margin: "0 auto 10px",
                flexShrink: 0,
              }}
            />
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
                display: "flex",
                flexDirection: "column",
                gap: 2,
                paddingBottom: 4,
              }}
            >
              {config.overflow.length === 0 ? (
                <p style={{ margin: "8px 0", fontSize: 14, color: "var(--text-secondary)", textAlign: "center" }}>
                  —
                </p>
              ) : (
                config.overflow.map((item) => {
                  const active = itemActive(item);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={item.prefetch}
                      onClick={closeSheet}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        minHeight: 48,
                        padding: "10px 12px",
                        borderRadius: 10,
                        textDecoration: "none",
                        color: active ? "var(--primary)" : "var(--text-primary)",
                        fontWeight: active ? 600 : 500,
                        fontSize: 15,
                        backgroundColor: active ? "var(--bg)" : "transparent",
                      }}
                      aria-current={active ? "page" : undefined}
                    >
                      <NavIcon id={item.icon} active={active} />
                      <span style={{ flex: 1 }}>{item.label}</span>
                    </Link>
                  );
                })
              )}
              {sheetFooter ? (
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 16,
                    paddingBottom: "max(16px, env(safe-area-inset-bottom, 0px))",
                    borderTop: "1px solid var(--border)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  {sheetFooter}
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </>
  );

  if (!mounted) return null;
  return createPortal(portalContent, document.body);
}
