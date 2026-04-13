"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Em mobile/PWA os timers de refresh do Supabase podem ser suspensos com o separador em segundo plano.
 * Ao voltar à app, `getSession()` reativa o fluxo de refresh e mantém os cookies alinhados com o servidor.
 */
export function AuthSessionKeepAlive() {
  useEffect(() => {
    const supabase = createClient();
    let lastRun = 0;
    const throttleMs = 45_000;

    const bump = () => {
      const now = Date.now();
      if (now - lastRun < throttleMs) return;
      lastRun = now;
      void supabase.auth.getSession();
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") bump();
    };

    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) bump();
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("online", bump);
    bump();

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("online", bump);
    };
  }, []);

  return null;
}
