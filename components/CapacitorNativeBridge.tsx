"use client";

import { useEffect } from "react";
import { isAuthCallbackDeepLink } from "@/lib/auth/oauth-callback-url";
import { isCapacitorNative } from "@/lib/capacitor-native";

/**
 * Comportamento só no shell Capacitor: status bar, botão voltar Android,
 * retorno OAuth (fecha Browser e navega para /auth/callback no WebView).
 */
export function CapacitorNativeBridge() {
  useEffect(() => {
    if (!isCapacitorNative()) return;

    document.documentElement.dataset.kfsNative = "capacitor";

    let cancelled = false;
    const cleanups: Array<() => void> = [];

    void (async () => {
      const { StatusBar, Style } = await import("@capacitor/status-bar");
      if (cancelled) return;
      try {
        await StatusBar.setBackgroundColor({ color: "#ED1C24" });
        await StatusBar.setStyle({ style: Style.Dark });
      } catch {
        /* iOS pode ignorar backgroundColor */
      }

      const { App } = await import("@capacitor/app");

      const onUrl = async (event: { url: string }) => {
        if (!isAuthCallbackDeepLink(event.url)) return;
        try {
          const { Browser } = await import("@capacitor/browser");
          await Browser.close();
        } catch {
          /* já fechado */
        }
        const target = event.url.startsWith("com.kingdomfight.school:")
          ? event.url.replace(/^com\.kingdomfight\.school:\/\//i, `${window.location.origin}/`)
          : event.url;
        window.location.href = target;
      };

      const urlHandle = await App.addListener("appUrlOpen", onUrl);
      cleanups.push(() => void urlHandle.remove());

      const backHandle = await App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
        } else {
          void App.exitApp();
        }
      });
      cleanups.push(() => void backHandle.remove());
    })();

    return () => {
      cancelled = true;
      delete document.documentElement.dataset.kfsNative;
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return null;
}
