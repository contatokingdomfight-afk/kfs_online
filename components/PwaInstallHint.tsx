"use client";

import { useEffect, useRef, useState } from "react";
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
    }, 4500);

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

  return (
    <div
      role="region"
      aria-label={t("pwaInstallApp")}
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 60,
        padding: "12px max(16px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))",
        background: "var(--bg-secondary)",
        borderTop: "1px solid var(--border)",
        boxShadow: "var(--shadow-md)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {hintKind === "bip" && (
        <button
          type="button"
          onClick={onInstallClick}
          style={{
            width: "100%",
            padding: "12px 16px",
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
      )}
      {hintKind === "ios" && (
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: "var(--text-primary)" }}>{t("pwaIosAddToHome")}</p>
      )}
      {hintKind === "chrome" && (
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: "var(--text-primary)" }}>{t("pwaChromeMenuInstall")}</p>
      )}
      <button
        type="button"
        onClick={dismiss}
        style={{
          alignSelf: "flex-end",
          background: "transparent",
          border: "none",
          color: "var(--text-secondary)",
          fontSize: 13,
          cursor: "pointer",
          textDecoration: "underline",
        }}
      >
        {t("pwaInstallDismiss")}
      </button>
    </div>
  );
}
