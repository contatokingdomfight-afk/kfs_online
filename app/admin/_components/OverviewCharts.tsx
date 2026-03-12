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

type MonthGrowth = { month: string; label: string; active: number; new: number };
type MonthRevenue = { month: string; revenue: number; label: string };
type ModalityShare = { name: string; value: number };

type Props = {
  studentsGrowthByMonth: { month: string; active: number; new: number; churned: number }[];
  revenueAccumulatedMonths: { month: string; revenue: number }[];
  attendanceByModality30Days: { modality: string; count: number }[];
  modalityNames: Record<string, string>;
  schoolName: string;
  labels: {
    growthTitle: string;
    revenueTitle: string;
    modalityTitle: string;
    noData: string;
  };
};

const MODALITY_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6"];

export function OverviewCharts(props: Props) {
  const {
    studentsGrowthByMonth,
    revenueAccumulatedMonths,
    attendanceByModality30Days,
    modalityNames,
    schoolName,
    labels,
  } = props;

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const growthData: MonthGrowth[] = studentsGrowthByMonth.map((r) => ({
    month: r.month,
    label: `${r.month.slice(5)}/${r.month.slice(0, 4)}`,
    active: r.active,
    new: r.new,
  }));

  const revenueData: MonthRevenue[] = revenueAccumulatedMonths.map((r) => ({
    ...r,
    label: `${r.month.slice(5)}/${r.month.slice(0, 4)}`,
  }));

  const modalityData: ModalityShare[] = attendanceByModality30Days.map((r) => ({
    name: (modalityNames[r.modality] ?? r.modality) || "Outras",
    value: r.count,
  }));

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
      {/* Crescimento de Alunos (6 meses) */}
      <section className="card" style={{ padding: "clamp(16px, 4vw, 20px)", minWidth: 0, overflow: "hidden" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
          {labels.growthTitle} ({schoolName})
        </h3>
        {growthData.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{labels.noData}</p>
        ) : (
          <div style={{ width: "100%", minWidth: 0, minHeight: 220, height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} stroke="var(--border)" />
                <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 11 }} stroke="var(--border)" />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}
                />
                <Legend />
                <Line type="monotone" dataKey="active" stroke="var(--primary)" strokeWidth={2} name="Total" dot={{ fill: "var(--primary)" }} />
                <Line type="monotone" dataKey="new" stroke="var(--success)" strokeWidth={2} name="Novos" dot={{ fill: "var(--success)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Receita Mensal (12 meses) */}
      <section className="card" style={{ padding: "clamp(16px, 4vw, 20px)", minWidth: 0, overflow: "hidden" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
          {labels.revenueTitle} ({schoolName})
        </h3>
        {revenueData.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{labels.noData}</p>
        ) : (
          <div style={{ width: "100%", minWidth: 0, minHeight: 220, height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
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

      {/* Popularidade das Modalidades (30 dias) */}
      <section className="card" style={{ padding: "clamp(16px, 4vw, 20px)", minWidth: 0, overflow: "hidden" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
          {labels.modalityTitle} ({schoolName})
        </h3>
        {modalityData.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{labels.noData}</p>
        ) : (
          <div style={{ width: "100%", minWidth: 0, minHeight: 220, height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
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
