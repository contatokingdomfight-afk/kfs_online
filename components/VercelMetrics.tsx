"use client";

import dynamic from "next/dynamic";
import { useHasAnalyticsConsent } from "@/lib/cookie-consent";

const Analytics = dynamic(() => import("@vercel/analytics/next").then((m) => ({ default: m.Analytics })), {
  ssr: false,
});

const SpeedInsights = dynamic(() => import("@vercel/speed-insights/next").then((m) => ({ default: m.SpeedInsights })), {
  ssr: false,
});

/**
 * Analytics (page views) só carrega depois de o utilizador aceitar cookies no banner
 * ("Aceitar todos") — RGPD: nenhum script de métricas dispara antes do consentimento.
 * Speed Insights está **desactivado por defeito**: o script `instrument.js` injecta um
 * Dialog Radix sem título e pode lançar `InvalidNodeTypeError: selectNode` no DevTools —
 * não afecta a app, mas polui a consola. Para reactivar métricas Web Vitals:
 * `NEXT_PUBLIC_ENABLE_SPEED_INSIGHTS=true` no Vercel.
 */
export function VercelMetrics() {
  const hasConsent = useHasAnalyticsConsent();
  const enableSpeed = process.env.NEXT_PUBLIC_ENABLE_SPEED_INSIGHTS === "true";

  if (!hasConsent) return null;

  return (
    <>
      <Analytics />
      {enableSpeed ? <SpeedInsights /> : null}
    </>
  );
}
