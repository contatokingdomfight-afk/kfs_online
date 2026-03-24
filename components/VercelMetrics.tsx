"use client";

import dynamic from "next/dynamic";

const Analytics = dynamic(() => import("@vercel/analytics/next").then((m) => ({ default: m.Analytics })), {
  ssr: false,
});

const SpeedInsights = dynamic(() => import("@vercel/speed-insights/next").then((m) => ({ default: m.SpeedInsights })), {
  ssr: false,
});

/** Carrega Analytics / Speed Insights no cliente para não competir com FCP/LCP. */
export function VercelMetrics() {
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
