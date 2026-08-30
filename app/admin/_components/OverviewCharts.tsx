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
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { InlineInfoTip } from "@/components/ui/InlineInfoTip";

type GrowthBucket = { bucket: string; active: number; new: number; churned: number };
type RevenueBucket = { bucket: string; revenue: number };
type ModalityShare = { name: string; value: number };

export type OverviewChartsProps = {
  growthByBucket: GrowthBucket[];
  revenueByBucket: RevenueBucket[];
  modalityPopularity: { modalityCode: string; modalityName: string; count: number }[];
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

const MODALITY_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6"];

function formatBucketLabel(bucket: string): string {
  if (bucket.length === 10) return `${bucket.slice(8, 10)}/${bucket.slice(5, 7)}`;
  return `${bucket.slice(5, 7)}/${bucket.slice(0, 4)}`;
}

export function OverviewCharts(props: OverviewChartsProps) {
  const { growthByBucket, revenueByBucket, modalityPopularity, schoolName, labels } = props;

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const growthData = growthByBucket.map((r) => ({ ...r, label: formatBucketLabel(r.bucket) }));
  const revenueData = revenueByBucket.map((r) => ({ ...r, label: formatBucketLabel(r.bucket) }));
  const modalityData: ModalityShare[] = modalityPopularity.map((r) => ({ name: r.modalityName, value: r.count }));

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
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={modalityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                >
                  {modalityData.map((_, i) => (
                    <Cell key={i} fill={MODALITY_COLORS[i % MODALITY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}
                  formatter={(value, name) => {
                    const v = Number(value ?? 0);
                    const total = modalityData.reduce((s, d) => s + d.value, 0);
                    const pct = total > 0 ? ((v / total) * 100).toFixed(1) : "0";
                    return [`${v} presenças (${pct}%)`, String(name ?? "")];
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}
