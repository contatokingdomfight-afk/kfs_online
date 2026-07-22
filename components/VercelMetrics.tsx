"use client";

import dynamic from "next/dynamic";

const Analytics = dynamic(() => import("@vercel/analytics/next").then((m) => ({ default: m.Analytics })), {
  ssr: false,
});

const SpeedInsights = dynamic(() => import("@vercel/speed-insights/next").then((m) => ({ default: m.SpeedInsights })), {
  ssr: false,
});

/**
 * Analytics (page views) fica activo. Speed Insights está **desactivado por defeito**:
 * o script `instrument.js` injecta um Dialog Radix sem título e pode lançar
 * `InvalidNodeTypeError: selectNode` no DevTools — não afecta a app, mas polui a consola.
 * Para reactivar métricas Web Vitals: `NEXT_PUBLIC_ENABLE_SPEED_INSIGHTS=true` no Vercel.
 */
export function VercelMetrics() {
  const enableSpeed = process.env.NEXT_PUBLIC_ENABLE_SPEED_INSIGHTS === "true";

  return (
    <>
      <Analytics />
      {enableSpeed ? <SpeedInsights /> : null}
    </>
  );
}
