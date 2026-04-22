"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Em mobile/PWA os timers de refresh do Supabase podem ser suspensos com o separador em segundo plano.
 * `refreshSession()` troca o refresh token por um par novo quando o JWT já expirou (caso típico após horas/dias fechado).
 * `getUser()` valida com o Auth e também pode renovar — usado como fallback.
 * `startAutoRefresh()` reactiva o ticker interno após mount.
 * Intervalo com o separador visível: reforço periódico enquanto a app está aberta.
 * Eventos: visibilitychange, pageshow (incl. abrir a PWA pelo ícone), focus, online, resume (Android).
 */
export function AuthSessionKeepAlive() {
  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.startAutoRefresh();

    let lastOnlineBump = 0;
    const onlineThrottleMs = 45_000;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    /** ~20 min: JWT default no Supabase costuma ser 1h; renovar antes reduz 401 após idle com app aberta. */
    const visibleRefreshIntervalMs = 20 * 60 * 1000;
    let visibleInterval: ReturnType<typeof setInterval> | null = null;

    const refreshFromServer = () => {
      void (async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.refresh_token) {
            const { error } = await supabase.auth.refreshSession();
            if (error) {
              await supabase.auth.getUser();
            }
          } else {
            await supabase.auth.getUser();
          }
        } catch {
          try {
            await supabase.auth.getUser();
          } catch {
            /* ignorar — rede ou sessão já inválida */
          }
        }
      })();
    };

    /** Volta do background / bfcache / outra app: refresh já + outro após debounce. */
    const scheduleResumeRefresh = () => {
      refreshFromServer();
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        refreshFromServer();
      }, 400);
    };

    const startVisibleInterval = () => {
      if (visibleInterval) return;
      visibleInterval = setInterval(() => {
        if (document.visibilityState === "visible") refreshFromServer();
      }, visibleRefreshIntervalMs);
    };

    const stopVisibleInterval = () => {
      if (visibleInterval) {
        clearInterval(visibleInterval);
        visibleInterval = null;
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        scheduleResumeRefresh();
        startVisibleInterval();
      } else {
        stopVisibleInterval();
      }
    };

    const onPageShow = (_e: PageTransitionEvent) => {
      // Sempre ao mostrar a página (abrir PWA pelo ícone, voltar de outra app, bfcache).
      scheduleResumeRefresh();
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

    /** Page Lifecycle API: separador descongelado (ex.: Chrome em Android). */
    const onResume = () => scheduleResumeRefresh();

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    document.addEventListener("resume", onResume as EventListener);
    refreshFromServer();
    if (document.visibilityState === "visible") startVisibleInterval();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      stopVisibleInterval();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("resume", onResume as EventListener);
    };
  }, []);

  return null;
}
