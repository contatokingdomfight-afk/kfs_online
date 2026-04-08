"use client";

import { useEffect } from "react";

/**
 * Expõe `data-pwa-standalone` no `<html>` para estilos quando a app corre como PWA instalada.
 */
export function PwaDisplayMode() {
  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    const apply = () => {
      document.documentElement.dataset.pwaStandalone = mq.matches ? "true" : "false";
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return null;
}
