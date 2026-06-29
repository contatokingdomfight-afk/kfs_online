"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "kfs_cookie_consent";
/** Acima da barra inferior mobile (BAR_Z=20_000) e do sheet «Mais» (SHEET_Z=20_500). */
const COOKIE_BANNER_Z = 25_000;
/** Altura aproximada da MobileAppBottomNav + safe-area. */
const MOBILE_BOTTOM_NAV_OFFSET = "calc(64px + max(10px, env(safe-area-inset-bottom, 0px)))";

function routeHasMobileBottomNav(pathname: string): boolean {
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/coach") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/como-sou-avaliado") ||
    pathname.startsWith("/sistema-pontuacao")
  );
}

export function CookieBanner() {
  const pathname = usePathname() ?? "";
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    const mql = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);

  function save(value: "all" | "essential") {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  if (!visible || !mounted) return null;

  const aboveMobileNav = isMobile && routeHasMobileBottomNav(pathname);

  const banner = (
    <div
      role="dialog"
      aria-label="Consentimento de cookies"
      style={{
        position: "fixed",
        bottom: aboveMobileNav ? MOBILE_BOTTOM_NAV_OFFSET : 0,
        left: 0,
        right: 0,
        zIndex: COOKIE_BANNER_Z,
        padding: "clamp(12px, 3vw, 16px)",
        paddingBottom: aboveMobileNav
          ? "clamp(12px, 3vw, 16px)"
          : "max(clamp(12px, 3vw, 16px), env(safe-area-inset-bottom, 0px))",
        background: "var(--surface)",
        borderTop: "1px solid var(--border)",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.12)",
      }}
    >
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "12px 16px",
          justifyContent: "space-between",
        }}
      >
        <p style={{ margin: 0, flex: "1 1 240px", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          Usamos cookies para melhorar a experiência. Consulta a nossa{" "}
          <Link href="/privacidade" style={{ color: "var(--primary)", fontWeight: 500 }}>
            política de privacidade
          </Link>
          .
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button type="button" className="btn btn-secondary" style={{ fontSize: 14 }} onClick={() => save("essential")}>
            Apenas essenciais
          </button>
          <button type="button" className="btn btn-primary" style={{ fontSize: 14 }} onClick={() => save("all")}>
            Aceitar todos
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(banner, document.body);
}
