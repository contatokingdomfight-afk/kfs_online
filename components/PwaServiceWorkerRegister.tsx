"use client";

import { useEffect } from "react";

/**
 * Regista o service worker mínimo em produção (pass-through de rede; sem cache de HTML/API).
 */
export function PwaServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        /* falha silenciosa — PWA continua instalável sem SW em alguns browsers */
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
