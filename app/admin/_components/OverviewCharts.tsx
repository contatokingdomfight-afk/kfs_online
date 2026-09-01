"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
  Legend,
} from "recharts";
import { InlineInfoTip } from "@/components/ui/InlineInfoTip";
import { buildModalityColorMap } from "@/lib/modality-chart-colors";

type GrowthBucket = { bucket: string; active: number; new: number; churned: number };
type RevenueBucket = { bucket: string; revenue: number };
type ModalityShare = { code: string; name: string; value: number };

export type OverviewChartsProps = {
  growthByBucket: GrowthBucket[];
  revenueByBucket: RevenueBucket[];
  modalityPopularity: { modalityCode: string; modalityName: string; count: number }[];
  /** Catálogo de modalidades da escola, na ordem usada para atribuir cor consistente entre gráficos. */
  modalityCatalog: { code: string; name: string }[];
  schoolName: string;
  labels: {
    growthTitle: string;
    revenueTitle: string;
    modalityTitle: string;
    noData: string;
    activeLabel: string;
    newLabel: string;
    churnedLabel: string;
    growthInfo: string;
    revenueInfo: string;
    modalityInfo: string;
  };
};

function formatBucketLabel(bucket: string): string {
  if (bucket.length === 10) return `${bucket.slice(8, 10)}/${bucket.slice(5, 7)}`;
  return `${bucket.slice(5, 7)}/${bucket.slice(0, 4)}`;
}

export function OverviewCharts(props: OverviewChartsProps) {
  const { growthByBucket, revenueByBucket, modalityPopularity, modalityCatalog, schoolName, labels } = props;

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const growthData = growthByBucket.map((r) => ({ ...r, label: formatBucketLabel(r.bucket) }));
  const revenueData = revenueByBucket.map((r) => ({ ...r, label: formatBucketLabel(r.bucket) }));
  const modalityColorMap = buildModalityColorMap(modalityCatalog.map((m) => m.code));
  const modalityData: ModalityShare[] = modalityPopularity
    .map((r) => ({ code: r.modalityCode, name: r.modalityName, value: r.count }))
    .sort((a, b) => b.value - a.value);
  const modalityTotal = modalityData.reduce((s, d) => s + d.value, 0);

  if (!mounted) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "clamp(24px, 6vw, 32px)", minWidth: 0 }}>
        <section className="card" style={{ padding: "clamp(16px, 4vw, 20px)", minHeight: 280 }} />
        <section className="card" style={{ padding: "clamp(16px, 4vw, 20px)", minHeight: 260 }} />
        <section className="card" style={{ padding: "clamp(16px, 4vw, 20px)", minHeight: 260 }} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(24px, 6vw, 32px)", minWidth: 0 }}>
      <section className="card" style={{ padding: "clamp(16px, 4vw, 20px)", minWidth: 0, overflow: "hidden" }}>
        <h3 style={{ margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: 8, fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
          {labels.growthTitle} ({schoolName})
          <InlineInfoTip trigger="click" detail={labels.growthInfo} ariaLabel={labels.growthTitle} />
        </h3>
        {growthData.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{labels.noData}</p>
        ) : (
          <div style={{ width: "100%", minWidth: 0 }}>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={growthData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} stroke="var(--border)" />
                <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 11 }} stroke="var(--border)" />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}
                />
                <Legend />
                <Line type="monotone" dataKey="active" stroke="var(--primary)" strokeWidth={2} name={labels.activeLabel} dot={{ fill: "var(--primary)" }} />
                <Line type="monotone" dataKey="new" stroke="var(--success)" strokeWidth={2} name={labels.newLabel} dot={{ fill: "var(--success)" }} />
                <Line type="monotone" dataKey="churned" stroke="#f59e0b" strokeWidth={2} name={labels.churnedLabel} dot={{ fill: "#f59e0b" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="card" style={{ padding: "clamp(16px, 4vw, 20px)", minWidth: 0, overflow: "hidden" }}>
        <h3 style={{ margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: 8, fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
          {labels.revenueTitle} ({schoolName})
          <InlineInfoTip trigger="click" detail={labels.revenueInfo} ariaLabel={labels.revenueTitle} />
        </h3>
        {revenueData.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{labels.noData}</p>
        ) : (
          <div style={{ width: "100%", minWidth: 0 }}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={revenueData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} stroke="var(--border)" />
                <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 11 }} stroke="var(--border)" tickFormatter={(v) => `${v} €`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}
                  formatter={(value: number | undefined) => [`${Number(value ?? 0).toFixed(2)} €`, "Receita"]}
                />
                <Bar dataKey="revenue" name="Receita" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="card" style={{ padding: "clamp(16px, 4vw, 20px)", minWidth: 0, overflow: "hidden" }}>
        <h3 style={{ margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: 8, fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
          {labels.modalityTitle} ({schoolName})
          <InlineInfoTip trigger="click" detail={labels.modalityInfo} ariaLabel={labels.modalityTitle} />
        </h3>
        {modalityData.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{labels.noData}</p>
        ) : (
          <div style={{ width: "100%", minWidth: 0 }}>
            <ResponsiveContainer width="100%" height={Math.max(180, modalityData.length * 42)}>
              <BarChart
                data={modalityData}
                layout="vertical"
                margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
                barCategoryGap={10}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} stroke="var(--border)" allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: "var(--text-primary)", fontSize: 12 }}
                  stroke="var(--border)"
                  width={110}
                />
                <Tooltip
                  cursor={{ fill: "var(--bg-tertiary, rgba(128,128,128,0.1))" }}
                  contentStyle={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}
                  formatter={(value) => {
                    const v = Number(value ?? 0);
                    const pct = modalityTotal > 0 ? ((v / modalityTotal) * 100).toFixed(1) : "0";
                    return [`${v} presenças (${pct}%)`, ""];
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22}>
                  {modalityData.map((d) => (
                    <Cell key={d.code} fill={modalityColorMap[d.code] ?? "var(--primary)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}
