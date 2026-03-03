"use client";

import dynamic from "next/dynamic";

const RadarStats = dynamic(
  () => import("./RadarStats").then((m) => ({ default: m.RadarStats })),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          minHeight: 280,
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

export { RadarStats };
export type { RadarAxis } from "./RadarStats";
