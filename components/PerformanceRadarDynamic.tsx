"use client";

import dynamic from "next/dynamic";

const PerformanceRadar = dynamic(
  () => import("@/components/PerformanceRadar").then((m) => ({ default: m.PerformanceRadar })),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          minHeight: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-secondary)",
          fontSize: 14,
        }}
      >
        A carregar gráfico…
      </div>
    ),
  }
);

export { PerformanceRadar };
