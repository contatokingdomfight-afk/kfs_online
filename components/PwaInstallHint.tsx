"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { getTranslations } from "@/lib/i18n";
import { usePwaInstall } from "@/components/PwaInstallProvider";
import { isNativeAppShell } from "@/lib/capacitor-native";

/** Acima da barra inferior mobile (z-index ~20_000). */
const PWA_HINT_Z = 25_000;
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

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    // @ts-expect-error legacy iOS
    window.navigator.standalone === true
  );
}

/**
 * Primeira visita (telemóvel): aviso em baixo mais visível.
 * Após «Agora não» ou ×, a instalação passa só para `SidebarPwaInstall`.
 */
export function PwaInstallHint() {
  const ctx = usePwaInstall();
  const pathname = usePathname() ?? "";
  const [hintKind, setHintKind] = useState<null | "bip" | "ios" | "chrome">(null);
  const [isMobile, setIsMobile] = useState(false);

  const locale = ctx?.locale ?? "pt";
  const t = getTranslations(locale);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 768px)");
    const sync = () => setIsMobile(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!ctx?.storageReady || ctx.preferSidebar) return;
    if (isNativeAppShell() || isStandaloneDisplay()) return;
    if (!window.matchMedia("(max-width: 768px)").matches) return;

    const ua = navigator.userAgent;
    const isIos =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    const fallbackTimer = window.setTimeout(() => {
      setHintKind((current) => {
        if (current === "bip") return current;
        return isIos ? "ios" : "chrome";
      });
    }, 6500);

    return () => window.clearTimeout(fallbackTimer);
  }, [ctx?.storageReady, ctx?.preferSidebar]);

  useEffect(() => {
    if (ctx?.deferredPrompt) setHintKind("bip");
  }, [ctx?.deferredPrompt]);

  if (!ctx?.storageReady || ctx.preferSidebar) return null;
  if (typeof window === "undefined") return null;
  if (isNativeAppShell() || isStandaloneDisplay()) return null;
  if (!isMobile) return null;
  if (!hintKind) return null;

  const aboveMobileNav = routeHasMobileBottomNav(pathname);
  const moveToSidebar = () => ctx.moveInstallToSidebar();

  const onInstallClick = async () => {
    const ev = ctx.deferredPrompt;
    if (!ev) return;
    try {
      await ev.prompt();
      await ev.userChoice;
    } finally {
      ctx.setDeferredPrompt(null);
    }
  };

  const textStyle: CSSProperties = {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.45,
    color: "var(--text-primary)",
  };

  return (
    <div
      role="region"
      aria-label={t("pwaInstallApp")}
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: aboveMobileNav ? MOBILE_BOTTOM_NAV_OFFSET : 0,
        zIndex: PWA_HINT_Z,
        padding:
          "16px max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))",
        background: "var(--bg)",
        borderTop: "1px solid var(--border)",
        boxShadow: "0 -8px 32px rgba(0,0,0,0.35)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {hintKind === "bip" && (
        <>
          <button
            type="button"
            onClick={onInstallClick}
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: "var(--radius-md)",
              background: "var(--primary)",
              color: "#fff",
              fontWeight: 600,
              fontSize: 16,
              border: "none",
              cursor: "pointer",
            }}
          >
            {t("pwaInstallApp")}
          </button>
          <p style={{ ...textStyle, fontSize: 12, color: "var(--text-secondary)" }}>{t("pwaInstallSubtle")}</p>
        </>
      )}
      {hintKind === "ios" && <p style={textStyle}>{t("pwaIosAddToHome")}</p>}
      {hintKind === "chrome" && <p style={{ ...textStyle, fontSize: 13 }}>{t("pwaChromeMenuInstall")}</p>}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <button
          type="button"
          onClick={moveToSidebar}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-primary)",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            textDecoration: "underline",
            padding: "8px 0",
            minHeight: 44,
          }}
        >
          {t("pwaInstallDismiss")}
        </button>
        <button
          type="button"
          onClick={moveToSidebar}
          aria-label={t("pwaInstallDismiss")}
          style={{
            minWidth: 44,
            minHeight: 44,
            padding: 0,
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            background: "var(--bg-secondary)",
            color: "var(--text-primary)",
            fontSize: 22,
            lineHeight: 1,
            cursor: "pointer",
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
