"use client";

import { useEffect, useState } from "react";

/**
 * Consentimento de cookies/analytics (RGPD). Única fonte de verdade para o CookieBanner
 * e para qualquer script de terceiros (Meta Pixel, Vercel Analytics) que só deve carregar
 * depois de "Aceitar todos".
 */
export const COOKIE_CONSENT_STORAGE_KEY = "kfs_cookie_consent";
const COOKIE_CONSENT_CHANGE_EVENT = "kfs-cookie-consent-change";

export type CookieConsentValue = "all" | "essential";

export function getStoredCookieConsent(): CookieConsentValue | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    return raw === "all" || raw === "essential" ? raw : null;
  } catch {
    return null;
  }
}

export function setStoredCookieConsent(value: CookieConsentValue) {
  try {
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, value);
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_CHANGE_EVENT, { detail: value }));
  } catch {
    /* ignore */
  }
}

/** true só depois de o utilizador escolher explicitamente "Aceitar todos". */
export function useHasAnalyticsConsent(): boolean {
  const [consent, setConsent] = useState<CookieConsentValue | null>(null);

  useEffect(() => {
    setConsent(getStoredCookieConsent());
    const onChange = () => setConsent(getStoredCookieConsent());
    window.addEventListener(COOKIE_CONSENT_CHANGE_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  return consent === "all";
}
