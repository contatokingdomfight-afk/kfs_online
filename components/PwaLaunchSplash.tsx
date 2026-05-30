"use client";

import { useEffect, useState } from "react";
import { BrandSplashLogo } from "@/components/BrandSplashLogo";
import { BRAND_ICON_BG } from "@/lib/brand";
import { isNativeAppShell } from "@/lib/capacitor-native";

const SESSION_KEY = "kfs-pwa-launch-splash-seen";
const MIN_VISIBLE_MS = 750;
const FADE_MS = 400;
const MAX_VISIBLE_MS = 2600;

function isInstalledWebApp(): boolean {
  if (typeof window === "undefined") return false;
  if (isNativeAppShell()) return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    // Safari iOS «Adicionar ao ecrã principal»
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Splash de arranque em PWA / app nativa: kfs-app-icon.png (transparente) sobre preto.
 */
export function PwaLaunchSplash() {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!isInstalledWebApp()) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, "1");

    setVisible(true);
    const shownAt = Date.now();
    let fadeTimer: number | undefined;
    let removeTimer: number | undefined;

    const startExit = () => {
      const elapsed = Date.now() - shownAt;
      const delay = Math.max(0, MIN_VISIBLE_MS - elapsed);
      fadeTimer = window.setTimeout(() => {
        setExiting(true);
        removeTimer = window.setTimeout(() => setVisible(false), FADE_MS);
      }, delay);
    };

    const maxTimer = window.setTimeout(startExit, MAX_VISIBLE_MS);

    if (document.readyState === "complete") {
      startExit();
    } else {
      window.addEventListener("load", startExit, { once: true });
    }

    return () => {
      window.clearTimeout(maxTimer);
      if (fadeTimer) window.clearTimeout(fadeTimer);
      if (removeTimer) window.clearTimeout(removeTimer);
      window.removeEventListener("load", startExit);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className="kfs-pwa-launch-splash"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "max(16px, env(safe-area-inset-top)) 20px max(16px, env(safe-area-inset-bottom))",
        backgroundColor: BRAND_ICON_BG,
        pointerEvents: "none",
        opacity: exiting ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease`,
      }}
    >
      <BrandSplashLogo
        variant="launch"
        className={exiting ? undefined : "kfs-brand-splash-logo-enter"}
      />
    </div>
  );
}
