"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Em mobile/PWA os timers de refresh do Supabase podem ser suspensos com o separador em segundo plano.
 * `getUser()` valida com o Auth e renova o JWT; `startAutoRefresh()` garante o ticker activo após mount.
 * Intervalo enquanto o separador está visível: evita JWT expirado só com timers internos pausados.
 * Eventos `visibilitychange`, `pageshow` (bfcache), `focus`, `online` e `resume` (Page Lifecycle / Android).
 */
export function AuthSessionKeepAlive() {
  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.startAutoRefresh();

    let lastOnlineBump = 0;
    const onlineThrottleMs = 45_000;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    /** Renovar JWT antes do típico ~1h — reduz logout após idle com o ecrã ligado. */
    const visibleRefreshIntervalMs = 45 * 60 * 1000;
    let visibleInterval: ReturnType<typeof setInterval> | null = null;

    const refreshFromServer = () => {
      void supabase.auth.getUser();
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
