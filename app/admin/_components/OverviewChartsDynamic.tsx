"use client";

import dynamic from "next/dynamic";
import type { OverviewChartsProps } from "./OverviewCharts";

const OverviewChartsLazy = dynamic(
  () => import("./OverviewCharts").then((m) => ({ default: m.OverviewCharts })),
  {
    ssr: false,
    loading: () => (
      <div
        className="card"
        style={{
          padding: 24,
          minHeight: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-secondary)",
        }}
      >
        A carregar gráficos…
      </div>
    ),
  }
);

export function OverviewChartsDynamic(props: OverviewChartsProps) {
  return <OverviewChartsLazy {...props} />;
}
