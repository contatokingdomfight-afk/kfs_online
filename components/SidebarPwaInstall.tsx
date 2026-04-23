"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/theme-locale";
import { getPwaInstallHelpVariant } from "@/lib/pwa-install-ui";
import { usePwaInstall } from "@/components/PwaInstallProvider";
import { isPwaInstalledWindow } from "@/lib/pwa-installed-window";

type Props = {
  locale: Locale;
};

/** Mesmo breakpoint do aviso inferior em `PwaInstallHint` */
const MOBILE_MAX_PX = 768;

/**
 * «Instalar app» no menu lateral.
 * - Chromium com `beforeinstallprompt`: botão abre o prompt nativo.
 * - Safari / outros: mesmo destaque; abre modal com passos (não existe API de instalação única).
 */
export function SidebarPwaInstall({ locale }: Props) {
  const pwa = usePwaInstall();
  const t = getTranslations(locale);
  const [showBlock, setShowBlock] = useState<boolean | null>(null);
  const [helpVariant, setHelpVariant] = useState<ReturnType<typeof getPwaInstallHelpVariant>>("generic");
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setHelpVariant(getPwaInstallHelpVariant());
  }, []);

  useEffect(() => {
    if (!pwa?.storageReady) return;

    const sync = () => {
      if (isPwaInstalledWindow()) {
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

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen]);

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

  const helpButtonLabel =
    helpVariant === "ios"
      ? t("pwaInstallHelpButtonIos")
      : helpVariant === "macos_safari"
        ? t("pwaInstallHelpButtonMac")
        : t("pwaInstallHelpButton");

  const modalTitle =
    helpVariant === "ios"
      ? t("pwaInstallModalTitleIos")
      : helpVariant === "macos_safari"
        ? t("pwaInstallModalTitleMac")
        : t("pwaInstallModalTitleGeneric");

  const modalBody =
    helpVariant === "ios"
      ? t("pwaInstallModalBodyIos")
      : helpVariant === "macos_safari"
        ? t("pwaInstallModalBodyMac")
        : t("pwaInstallModalBodyGeneric");

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
        <>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="app-sidebar-pwa-install-btn"
            style={btnStyle}
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden stroke="currentColor" strokeWidth={2}>
              <rect x="5" y="2" width="14" height="20" rx="2" />
              <path d="M12 18h.01" strokeLinecap="round" />
            </svg>
            <span>{helpButtonLabel}</span>
          </button>
          {modalOpen && (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="pwa-install-help-title"
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 2002,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 16,
                backgroundColor: "rgba(0,0,0,0.55)",
                boxSizing: "border-box",
              }}
              onClick={() => setModalOpen(false)}
            >
              <div
                className="card"
                style={{
                  maxWidth: 420,
                  width: "100%",
                  maxHeight: "min(85vh, 560px)",
                  overflow: "auto",
                  padding: "20px 20px 16px",
                  backgroundColor: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  boxSizing: "border-box",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                  <h2
                    id="pwa-install-help-title"
                    style={{
                      margin: 0,
                      fontSize: "clamp(17px, 4vw, 19px)",
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      lineHeight: 1.3,
                    }}
                  >
                    {modalTitle}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    aria-label={t("close")}
                    style={{
                      flexShrink: 0,
                      width: 40,
                      height: 40,
                      border: "none",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--bg)",
                      color: "var(--text-secondary)",
                      fontSize: 22,
                      lineHeight: 1,
                      cursor: "pointer",
                    }}
                  >
                    ×
                  </button>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "clamp(14px, 3.5vw, 15px)",
                    lineHeight: 1.55,
                    color: "var(--text-primary)",
                    whiteSpace: "pre-line",
                  }}
                >
                  {modalBody}
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setModalOpen(false)}
                  style={{ marginTop: 20, width: "100%", minHeight: 44 }}
                >
                  {t("close")}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
