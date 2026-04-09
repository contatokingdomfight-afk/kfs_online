"use client";

import { useCallback, useEffect, useState } from "react";
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

  const linkInactive = {
    display: "flex" as const,
    alignItems: "center" as const,
    minHeight: "clamp(44px, 11vw, 48px)",
    padding: "12px 20px",
    fontSize: "clamp(14px, 3.5vw, 16px)",
    color: "var(--text-primary)",
    fontWeight: 500,
    backgroundColor: "transparent",
    borderLeft: "4px solid transparent",
    width: "100%",
    textAlign: "left" as const,
    cursor: "pointer",
    border: "none",
    borderRadius: "0 var(--radius-md) var(--radius-md) 0",
    fontFamily: "inherit",
  };

  const footnoteStyle = {
    margin: "4px 0 0 12px",
    fontSize: 11,
    lineHeight: 1.4,
    color: "var(--text-secondary)",
    paddingLeft: 8,
  };

  return (
    <div style={{ padding: "0 12px 8px 0" }}>
      {pwa.deferredPrompt ? (
        <button type="button" onClick={onInstall} style={linkInactive}>
          {t("pwaInstallApp")}
        </button>
      ) : (
        <p style={{ ...footnoteStyle, marginTop: 0 }}>{t("pwaInstallSidebarFootnote")}</p>
      )}
    </div>
  );
}
