"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { BRAND_BG, BRAND_LOGO_NO_BG } from "@/lib/brand";
import { isNativeAppShell } from "@/lib/capacitor-native";

/**
 * Splash de arranque em PWA instalada / shell nativo: logotipo em fundo grafite.
 * Complementa o splash do manifest (ícone) até a app estar pronta.
 */
export function PwaLaunchSplash() {
  const [mounted, setMounted] = useState(false);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const mqStand = window.matchMedia("(display-mode: standalone)");
    const mqFull = window.matchMedia("(display-mode: fullscreen)");
    const isInstalled =
      isNativeAppShell() || mqStand.matches || mqFull.matches;
    if (!isInstalled) return;

    setMounted(true);

    let fadeTimer: number | undefined;
    let removeTimer: number | undefined;

    const startFade = () => {
      setOpacity(0);
      removeTimer = window.setTimeout(() => setMounted(false), 400);
    };

    const onReady = () => {
      fadeTimer = window.setTimeout(startFade, 400);
    };

    const maxTimer = window.setTimeout(startFade, 2400);

    if (document.readyState === "complete") {
      onReady();
    } else {
      window.addEventListener("load", onReady, { once: true });
    }

    return () => {
      window.clearTimeout(maxTimer);
      if (fadeTimer) window.clearTimeout(fadeTimer);
      if (removeTimer) window.clearTimeout(removeTimer);
      window.removeEventListener("load", onReady);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: BRAND_BG,
        pointerEvents: "none",
        opacity,
        transition: "opacity 0.4s ease",
      }}
    >
      <Image
        src={BRAND_LOGO_NO_BG}
        alt=""
        width={280}
        height={280}
        priority
        style={{
          width: "min(72vw, 280px)",
          height: "auto",
          objectFit: "contain",
        }}
      />
    </div>
  );
}
