"use client";

import { useEffect } from "react";
import { isPwaInstalledWindow } from "@/lib/pwa-installed-window";

/**
 * Expõe `data-pwa-standalone` no `<html>` para estilos quando a app corre como PWA instalada
 * (`display: standalone` ou `display: fullscreen` no manifest).
 */
export function PwaDisplayMode() {
  useEffect(() => {
    const mqStand = window.matchMedia("(display-mode: standalone)");
    const mqFull = window.matchMedia("(display-mode: fullscreen)");
    const apply = () => {
      document.documentElement.dataset.pwaStandalone = isPwaInstalledWindow() ? "true" : "false";
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
