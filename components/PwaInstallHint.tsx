"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/messages";

const DISMISS_KEY = "kfs-pwa-install-dismissed";
const DISMISS_MS = 14 * 24 * 60 * 60 * 1000;

/** Chromium: beforeinstallprompt (não está em todos os lib.dom) */
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Props = {
  locale: Locale;
};

export function PwaInstallHint({ locale }: Props) {
  const t = getTranslations(locale);
  const [mounted, setMounted] = useState(false);
  const [hintKind, setHintKind] = useState<null | "bip" | "ios" | "chrome">(null);
  const deferredRef = useRef<InstallPromptEvent | null>(null);
  const bipSeenRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;

    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const nav = navigator as Navigator & { standalone?: boolean };
    if (nav.standalone === true) return;

    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const ts = parseInt(dismissed, 10);
      if (Number.isFinite(ts) && Date.now() - ts < DISMISS_MS) return;
    }

    if (!window.matchMedia("(max-width: 768px)").matches) return;

    const ua = navigator.userAgent;
    const isIos =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    const onBip = (e: Event) => {
      e.preventDefault();
      bipSeenRef.current = true;
      deferredRef.current = e as InstallPromptEvent;
      setHintKind("bip");
    };

    window.addEventListener("beforeinstallprompt", onBip);

    const fallbackTimer = window.setTimeout(() => {
      if (bipSeenRef.current) return;
      setHintKind(isIos ? "ios" : "chrome");
    }, 6500);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.clearTimeout(fallbackTimer);
    };
  }, [mounted]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setHintKind(null);
    deferredRef.current = null;
  };

  const onInstallClick = async () => {
    const ev = deferredRef.current;
    if (!ev) return;
    try {
      await ev.prompt();
      await ev.userChoice;
    } finally {
      deferredRef.current = null;
      dismiss();
    }
  };

  if (!mounted || !hintKind) return null;

  const textStyle: CSSProperties = {
    margin: 0,
    fontSize: 12,
    lineHeight: 1.45,
    color: "var(--text-secondary)",
    paddingRight: 22,
  };

  return (
    <div
      role="region"
      aria-label={t("pwaInstallApp")}
      style={{
        position: "fixed",
        left: "max(12px, env(safe-area-inset-left))",
        right: "max(12px, env(safe-area-inset-right))",
        bottom: "max(12px, env(safe-area-inset-bottom))",
        zIndex: 60,
        maxWidth: 340,
        marginLeft: "auto",
        marginRight: "auto",
        padding: "10px 12px",
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("pwaInstallDismiss")}
        style={{
          position: "absolute",
          top: 6,
          right: 6,
          width: 28,
          height: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          border: "none",
          borderRadius: "var(--radius-sm)",
          background: "transparent",
          color: "var(--text-secondary)",
          fontSize: 18,
          lineHeight: 1,
          cursor: "pointer",
        }}
      >
        ×
      </button>

      {hintKind === "bip" && (
        <div style={{ paddingRight: 18 }}>
          <button
            type="button"
            onClick={onInstallClick}
            style={{
              padding: "6px 12px",
              borderRadius: "var(--radius-md)",
              background: "transparent",
              color: "var(--primary)",
              fontWeight: 500,
              fontSize: 13,
              border: "1px solid var(--border)",
              cursor: "pointer",
            }}
          >
            {t("pwaInstallApp")}
          </button>
          <p style={{ ...textStyle, marginTop: 8, paddingRight: 0, fontSize: 11 }}>{t("pwaInstallSubtle")}</p>
        </div>
      )}
      {hintKind === "ios" && <p style={textStyle}>{t("pwaIosAddToHome")}</p>}
      {hintKind === "chrome" && <p style={textStyle}>{t("pwaChromeMenuInstall")}</p>}
    </div>
  );
}
