"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/** Se faltar menos disto para o JWT expirar, pedimos refresh explícito (evita 401 no middleware). */
const JWT_REFRESH_WHEN_WITHIN_MS = 22 * 60 * 1000;
/** Verificação periódica com o ecrã visível (não força refresh a cada tick — só perto do expiry). */
const VISIBLE_CHECK_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Em mobile/PWA os timers de refresh do Supabase podem ser suspensos com o separador em segundo plano.
 * Importante: **não** chamar `refreshSession()` em loop fixo sempre que há refresh_token — isso roda o token
 * constantemente e pode aumentar falhas/revogações. Só renovamos o JWT quando está perto de expirar; ao voltar
 * do background fazemos recuperação mais agressiva.
 * `startAutoRefresh()` reactiva o ticker interno do cliente após mount.
 * Eventos: visibilitychange, pageshow, focus, online, resume (Android).
 */
export function AuthSessionKeepAlive() {
  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.startAutoRefresh();

    let lastOnlineBump = 0;
    const onlineThrottleMs = 45_000;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let visibleInterval: ReturnType<typeof setInterval> | null = null;

    /** Renova JWT só se estiver quase a expirar; caso contrário confia no access token actual. */
    const refreshIfJwtNearExpiry = () => {
      void (async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session) {
            await supabase.auth.getUser();
            return;
          }
          const expMs = session.expires_at ? session.expires_at * 1000 : 0;
          const msLeft = expMs > 0 ? expMs - Date.now() : 0;
          if ((!expMs || msLeft < JWT_REFRESH_WHEN_WITHIN_MS) && session.refresh_token) {
            const { error } = await supabase.auth.refreshSession();
            if (error) await supabase.auth.getUser();
          }
        } catch {
          try {
            await supabase.auth.getUser();
          } catch {
            /* ignorar */
          }
        }
      })();
    };

    /** Voltar de outra app / PWA / muito tempo em background: tentar refresh explícito se ainda houver refresh token. */
    const refreshAfterResume = () => {
      void (async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.refresh_token) {
            const { error } = await supabase.auth.refreshSession();
            if (error) await supabase.auth.getUser();
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

    /** Volta do background / bfcache / outra app: recuperação agressiva + segundo passe após debounce. */
    const scheduleResumeRefresh = () => {
      refreshAfterResume();
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        refreshAfterResume();
      }, 400);
    };

    const startVisibleInterval = () => {
      if (visibleInterval) return;
      visibleInterval = setInterval(() => {
        if (document.visibilityState === "visible") refreshIfJwtNearExpiry();
      }, VISIBLE_CHECK_INTERVAL_MS);
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
      refreshAfterResume();
    };

    /** Page Lifecycle API: separador descongelado (ex.: Chrome em Android). */
    const onResume = () => scheduleResumeRefresh();

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    document.addEventListener("resume", onResume as EventListener);
    refreshAfterResume();
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
