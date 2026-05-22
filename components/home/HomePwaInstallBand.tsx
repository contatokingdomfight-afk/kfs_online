"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { getTranslations } from "@/lib/i18n";
import type { HomeLocale } from "@/lib/home-content";
import { getPwaInstallHelpVariant } from "@/lib/pwa-install-ui";
import { usePwaInstall } from "@/components/PwaInstallProvider";
import { isNativeAppShell } from "@/lib/capacitor-native";

type Props = {
  locale: HomeLocale;
  title: string;
  subtitle: string;
};

/**
 * Faixa na homepage com CTA «instalar app» (PWA), visível em mobile e desktop
 * quando a app ainda não está em modo instalado — sem o gate `preferSidebar` do menu lateral.
 */
export function HomePwaInstallBand({ locale, title, subtitle }: Props) {
  const pwa = usePwaInstall();
  const t = getTranslations(locale);
  const [visible, setVisible] = useState(false);
  const [helpVariant, setHelpVariant] = useState<ReturnType<typeof getPwaInstallHelpVariant>>("generic");
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setHelpVariant(getPwaInstallHelpVariant());
  }, []);

  useEffect(() => {
    if (!pwa?.storageReady) return;
    setVisible(!isNativeAppShell());
  }, [pwa?.storageReady]);

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

  if (!pwa?.storageReady || !visible) return null;

  const btnStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    minHeight: 48,
    padding: "12px 22px",
    fontSize: "clamp(15px, 3.5vw, 17px)",
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
    <section
      className="border-b border-[var(--border)] bg-[var(--bg-secondary)] py-8 sm:py-10"
      aria-labelledby="home-pwa-install-heading"
    >
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-4 text-center sm:px-6 lg:px-8">
        <h2 id="home-pwa-install-heading" className="text-lg font-bold text-[var(--text-primary)] sm:text-xl">
          {title}
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">{subtitle}</p>
        {pwa.deferredPrompt ? (
          <button type="button" onClick={onInstall} style={btnStyle}>
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
            <button type="button" onClick={() => setModalOpen(true)} style={btnStyle}>
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
                aria-labelledby="home-pwa-modal-title"
                className="fixed inset-0 z-[2002] flex items-center justify-center bg-black/55 p-4"
                onClick={() => setModalOpen(false)}
              >
                <div
                  className="card max-h-[min(85vh,560px)] w-full max-w-md overflow-auto border border-[var(--border)] bg-[var(--bg-secondary)] p-5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h2
                      id="home-pwa-modal-title"
                      className="m-0 text-lg font-bold leading-snug text-[var(--text-primary)] sm:text-xl"
                    >
                      {modalTitle}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      aria-label={t("close")}
                      className="h-10 w-10 shrink-0 cursor-pointer rounded-[var(--radius-sm)] border-none bg-[var(--bg)] text-[var(--text-secondary)]"
                    >
                      ×
                    </button>
                  </div>
                  <p className="m-0 whitespace-pre-line text-sm leading-relaxed text-[var(--text-primary)] sm:text-[15px]">
                    {modalBody}
                  </p>
                  <button type="button" className="btn btn-primary mt-5 min-h-11 w-full" onClick={() => setModalOpen(false)}>
                    {t("close")}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
