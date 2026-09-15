"use client";

import { useEffect, useRef } from "react";

export const AUTO_PRINT_STORAGE_KEY = "kfs-auto-print";

/** Dispara window.print() uma vez quando a navegação veio do botão «Imprimir» dos documentos. */
export function AutoPrintTrigger() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    if (sessionStorage.getItem(AUTO_PRINT_STORAGE_KEY) !== "1") return;

    ran.current = true;
    sessionStorage.removeItem(AUTO_PRINT_STORAGE_KEY);

    const timer = window.setTimeout(() => window.print(), 300);
    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
