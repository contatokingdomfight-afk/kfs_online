"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { getTranslations } from "@/lib/i18n";
import { usePwaInstall } from "@/components/PwaInstallProvider";
import { isPwaInstalledWindow } from "@/lib/pwa-installed-window";

/**
 * Primeira visita (telemóvel): aviso em baixo mais visível.
 * Após «Agora não» ou ×, a instalação passa só para `SidebarPwaInstall`.
 */
export function PwaInstallHint() {
  const ctx = usePwaInstall();
  const [hintKind, setHintKind] = useState<null | "bip" | "ios" | "chrome">(null);

  const locale = ctx?.locale ?? "pt";
  const t = getTranslations(locale);

  useEffect(() => {
    if (!ctx?.storageReady || ctx.preferSidebar) return;

    if (isPwaInstalledWindow()) return;
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

  if (isPwaInstalledWindow()) return null;
  if (!window.matchMedia("(max-width: 768px)").matches) return null;

  if (!hintKind) return null;

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
        bottom: 0,
        zIndex: 60,
        padding:
          "16px max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))",
        background: "var(--bg-secondary)",
        borderTop: "1px solid var(--border)",
        boxShadow: "var(--shadow-md)",
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
            color: "var(--text-secondary)",
            fontSize: 14,
            cursor: "pointer",
            textDecoration: "underline",
            padding: 0,
          }}
        >
          {t("pwaInstallDismiss")}
        </button>
        <button
          type="button"
          onClick={moveToSidebar}
          aria-label={t("pwaInstallDismiss")}
          style={{
            minWidth: 40,
            minHeight: 40,
            padding: 0,
            border: "none",
            borderRadius: "var(--radius-sm)",
            background: "transparent",
            color: "var(--text-secondary)",
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
