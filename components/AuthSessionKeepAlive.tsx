"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Em mobile/PWA os timers de refresh do Supabase podem ser suspensos com o separador em segundo plano.
 * `getUser()` força validação com o servidor e renova o JWT se o access token tiver expirado (melhor que
 * `getSession()`, que pode devolver sessão local desactualizada).
 * Ao voltar à app **não** aplicamos o throttle de 45s: caso contrário o primeiro pedido após idle longo
 * podia não refrescar a tempo e o middleware redireccionava para sign-in.
 */
export function AuthSessionKeepAlive() {
  useEffect(() => {
    const supabase = createClient();
    let lastOnlineBump = 0;
    const onlineThrottleMs = 45_000;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const refreshFromServer = () => {
      void supabase.auth.getUser();
    };

    /** Volta do background / bfcache / outra app: refresh imediato (com debounce para evitar rajadas). */
    const scheduleResumeRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        refreshFromServer();
      }, 400);
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") scheduleResumeRefresh();
    };

    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) scheduleResumeRefresh();
    };

    const onFocus = () => {
      if (document.visibilityState === "visible") scheduleResumeRefresh();
    };

    const onOnline = () => {
      const now = Date.now();
      if (now - lastOnlineBump < onlineThrottleMs) return;
      lastOnlineBump = now;
      refreshFromServer();
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    refreshFromServer();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return null;
}
