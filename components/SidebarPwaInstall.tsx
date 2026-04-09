"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/theme-locale";
import { usePwaInstall } from "@/components/PwaInstallProvider";

type Props = {
  locale: Locale;
};

/** Mesmo breakpoint do aviso inferior em `PwaInstallHint` */
const MOBILE_MAX_PX = 768;

/**
 * «Instalar app» no menu lateral.
 * - Desktop: sempre visível (o aviso em baixo só existe em mobile).
 * - Mobile: só depois de «Agora não» / × no aviso (evita duplicar com o banner).
 */
export function SidebarPwaInstall({ locale }: Props) {
  const pwa = usePwaInstall();
  const t = getTranslations(locale);
  /** null = ainda não mediu viewport; evita SSR/client mismatch */
  const [showBlock, setShowBlock] = useState<boolean | null>(null);

  useEffect(() => {
    if (!pwa?.storageReady) return;

    const isStandalone = () =>
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    const sync = () => {
      if (isStandalone()) {
        setShowBlock(false);
        return;
      }
      const narrow = window.matchMedia(`(max-width: ${MOBILE_MAX_PX}px)`).matches;
      const allow = !narrow || pwa.preferSidebar;
      setShowBlock(allow);
    };

    sync();

    const mqlNarrow = window.matchMedia(`(max-width: ${MOBILE_MAX_PX}px)`);
    mqlNarrow.addEventListener("change", sync);
    return () => mqlNarrow.removeEventListener("change", sync);
  }, [pwa?.storageReady, pwa?.preferSidebar]);

  const onInstall = useCallback(async () => {
    const ev = pwa?.deferredPrompt;
    if (!ev) return;
    try {
      await ev.prompt();
      await ev.userChoice;
    } finally {
      pwa?.setDeferredPrompt(null);
    }
  }, [pwa]);

  if (!pwa?.storageReady || showBlock !== true) return null;

  const btnStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    minHeight: 48,
    padding: "12px 16px",
    width: "100%",
    fontSize: "clamp(14px, 3.5vw, 16px)",
    fontWeight: 600,
    color: "#fff",
    backgroundColor: "var(--primary)",
    border: "none",
    borderRadius: "var(--radius-md)",
    cursor: "pointer",
    fontFamily: "inherit",
    boxShadow: "0 2px 10px rgba(193, 18, 31, 0.35)",
    WebkitTapHighlightColor: "transparent",
  };

  const footnoteBox: CSSProperties = {
    margin: 0,
    fontSize: 11,
    lineHeight: 1.45,
    color: "var(--text-secondary)",
    padding: "10px 12px",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--border)",
    backgroundColor: "var(--bg)",
  };

  return (
    <div style={{ padding: "0 0 4px 0" }}>
      {pwa.deferredPrompt ? (
        <button
          type="button"
          onClick={onInstall}
          className="app-sidebar-pwa-install-btn"
          style={btnStyle}
        >
          <svg
            width={20}
            height={20}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>{t("pwaInstallApp")}</span>
        </button>
      ) : (
        <p style={footnoteBox}>{t("pwaInstallSidebarFootnote")}</p>
      )}
    </div>
  );
}
