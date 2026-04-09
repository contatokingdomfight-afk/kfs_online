"use client";

import { useCallback, useEffect, useState } from "react";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/theme-locale";
import { usePwaInstall } from "@/components/PwaInstallProvider";

type Props = {
  locale: Locale;
};

/**
 * Mostra «Instalar app» no menu lateral depois de «Agora não» no aviso inicial.
 */
export function SidebarPwaInstall({ locale }: Props) {
  const pwa = usePwaInstall();
  const t = getTranslations(locale);
  const [standalone, setStandalone] = useState(true);

  useEffect(() => {
    setStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  }, []);

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

  if (!pwa?.storageReady || !pwa.preferSidebar || standalone) return null;

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
