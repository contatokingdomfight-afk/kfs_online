"use client";

import dynamic from "next/dynamic";

const LOADING = (
  <div
    className="card"
    style={{ padding: 24, minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}
  >
    A carregar gráficos…
  </div>
);

export const CheckinsByWeekdayChartDynamic = dynamic(
  () => import("./PeriodBarCharts").then((m) => ({ default: m.CheckinsByWeekdayChart })),
  { ssr: false, loading: () => LOADING }
);

export const EvaluationsPerWeekChartDynamic = dynamic(
  () => import("./PeriodBarCharts").then((m) => ({ default: m.EvaluationsPerWeekChart })),
  { ssr: false, loading: () => LOADING }
);
