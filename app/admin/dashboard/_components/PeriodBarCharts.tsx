"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { InlineInfoTip } from "@/components/ui/InlineInfoTip";

type WeekdayDatum = { weekday: number; count: number };
type WeekDatum = { weekStart: string; count: number };

function ChartFrame({
  title,
  empty,
  noDataLabel,
  info,
  children,
}: {
  title: string;
  empty: boolean;
  noDataLabel: string;
  info: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card" style={{ padding: "clamp(16px, 4vw, 20px)", minWidth: 0, overflow: "hidden" }}>
      <h3 style={{ margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: 8, fontSize: "clamp(16px, 4vw, 18px)", fontWeight: 600, color: "var(--text-primary)" }}>
        {title}
        <InlineInfoTip trigger="click" detail={info} ariaLabel={title} />
      </h3>
      {empty ? <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{noDataLabel}</p> : children}
    </section>
  );
}

export function CheckinsByWeekdayChart({
  data,
  title,
  noDataLabel,
  info,
  weekdayLabels,
}: {
  data: WeekdayDatum[];
  title: string;
  noDataLabel: string;
  info: string;
  weekdayLabels: string[];
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const chartData = data.map((d) => ({ label: weekdayLabels[d.weekday - 1] ?? String(d.weekday), count: d.count }));
  const hasData = chartData.some((d) => d.count > 0);

  if (!mounted) return <section className="card" style={{ padding: 20, minHeight: 260 }} />;

  return (
    <ChartFrame title={title} empty={!hasData} noDataLabel={noDataLabel} info={info}>
      <div style={{ width: "100%", minWidth: 0 }}>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} stroke="var(--border)" />
            <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 11 }} stroke="var(--border)" allowDecimals={false} />
            <Tooltip
              contentStyle={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}
            />
            <Bar dataKey="count" name="Check-ins" fill="var(--primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

export function EvaluationsPerWeekChart({
  data,
  title,
  noDataLabel,
  info,
}: {
  data: WeekDatum[];
  title: string;
  noDataLabel: string;
  info: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const chartData = data.map((d) => ({
    label: `${d.weekStart.slice(8, 10)}/${d.weekStart.slice(5, 7)}`,
    count: d.count,
  }));
  const hasData = chartData.some((d) => d.count > 0);

  if (!mounted) return <section className="card" style={{ padding: 20, minHeight: 260 }} />;

  return (
    <ChartFrame title={title} empty={!hasData} noDataLabel={noDataLabel} info={info}>
      <div style={{ width: "100%", minWidth: 0 }}>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} stroke="var(--border)" />
            <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 11 }} stroke="var(--border)" allowDecimals={false} />
            <Tooltip
              contentStyle={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}
            />
            <Bar dataKey="count" name="Avaliações" fill="var(--primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}
