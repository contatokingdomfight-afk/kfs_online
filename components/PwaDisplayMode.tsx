"use client";

import { useEffect } from "react";
import { isNativeAppShell } from "@/lib/capacitor-native";

/**
 * Expõe `data-pwa-standalone` no `<html>` para estilos quando a app corre como PWA instalada
 * (`display: standalone` ou `display: fullscreen` no manifest).
 */
export function PwaDisplayMode() {
  useEffect(() => {
    const mqStand = window.matchMedia("(display-mode: standalone)");
    const mqFull = window.matchMedia("(display-mode: fullscreen)");
    const apply = () => {
      const isInstalled =
        isNativeAppShell() || mqStand.matches || mqFull.matches;
      document.documentElement.dataset.pwaStandalone = isInstalled
        ? "true"
        : "false";
    };
    apply();
    mqStand.addEventListener("change", apply);
    mqFull.addEventListener("change", apply);
    return () => {
      mqStand.removeEventListener("change", apply);
      mqFull.removeEventListener("change", apply);
    };
  }, []);

  return null;
}
