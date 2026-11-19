"use client";

import { useEffect, useRef } from "react";

/**
 * Captcha Cloudflare Turnstile para os formulários de autenticação.
 * Só está ativo se `NEXT_PUBLIC_TURNSTILE_SITE_KEY` estiver definida; sem ela não desenha nada e os
 * formulários funcionam como antes (por isso o código pode ir para produção antes do captcha ser ligado
 * no Supabase: Authentication → Attack Protection → Enable CAPTCHA protection → Turnstile).
 * Quando o captcha está ligado no Supabase, TODAS as chamadas de palavra-passe (registo, login,
 * recuperação, reenvio de confirmação) têm de levar o token: ver `captchaOptions`.
 */
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || "";
export const turnstileEnabled = TURNSTILE_SITE_KEY.length > 0;

/** `{ captchaToken }` para passar em `options` do Supabase Auth (vazio se o captcha estiver desligado). */
export function captchaOptions(token: string | null): { captchaToken?: string } {
  return token ? { captchaToken: token } : {};
}

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => {
        scriptPromise = null;
        reject(new Error("turnstile script"));
      };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

type Props = {
  /** Token válido (uso único) ou `null` quando expira/falha. */
  onToken: (token: string | null) => void;
  /** Incrementa depois de cada tentativa para pedir um token novo (os tokens só valem uma vez). */
  resetKey?: number;
  locale?: "pt" | "en";
};

export function TurnstileWidget({ onToken, resetKey = 0, locale = "pt" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    if (!turnstileEnabled) return;
    let cancelled = false;
    loadTurnstileScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(ref.current, {
          sitekey: TURNSTILE_SITE_KEY,
          language: locale,
          theme: "auto",
          callback: (token: string) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => onTokenRef.current(null),
        });
      })
      .catch(() => onTokenRef.current(null));
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [locale]);

  useEffect(() => {
    if (resetKey === 0 || !widgetId.current || !window.turnstile) return;
    onTokenRef.current(null);
    window.turnstile.reset(widgetId.current);
  }, [resetKey]);

  if (!turnstileEnabled) return null;
  return <div ref={ref} style={{ minHeight: 65, display: "flex", justifyContent: "center" }} />;
}
