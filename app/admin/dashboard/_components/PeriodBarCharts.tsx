"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { InlineInfoTip } from "@/components/ui/InlineInfoTip";
import { buildModalityColorMap } from "@/lib/modality-chart-colors";

type ModalityBreakdown = { modalityCode: string; modalityName: string; count: number };
type WeekdayDatum = { weekday: number; count: number; byModality: ModalityBreakdown[] };
type WeekDatum = { weekStart: string; count: number; byModality: ModalityBreakdown[] };
type ModalityCatalogEntry = { code: string; name: string };

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

/** Achata `byModality` de cada linha num objeto {label, [modalityCode]: count, ...} para barras empilhadas. */
function pivotByModality<T extends { byModality: ModalityBreakdown[] }>(
  rows: (T & { label: string })[]
): Record<string, number | string>[] {
  return rows.map((r) => {
    const row: Record<string, number | string> = { label: r.label };
    for (const m of r.byModality) row[m.modalityCode || "__none"] = m.count;
    return row;
  });
}

function modalityCodesPresent(rows: { byModality: ModalityBreakdown[] }[]): { code: string; name: string }[] {
  const byCode = new Map<string, string>();
  for (const r of rows) {
    for (const m of r.byModality) {
      if (m.count > 0) byCode.set(m.modalityCode || "__none", m.modalityName);
    }
  }
  return [...byCode.entries()].map(([code, name]) => ({ code, name }));
}

function tooltipFormatter(value: number | string, name: string, codesToName: Map<string, string>) {
  return [String(value), codesToName.get(name) ?? name];
}

export function CheckinsByWeekdayChart({
  data,
  title,
  noDataLabel,
  info,
  weekdayLabels,
  modalityCatalog,
}: {
  data: WeekdayDatum[];
  title: string;
  noDataLabel: string;
  info: string;
  weekdayLabels: string[];
  modalityCatalog: ModalityCatalogEntry[];
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const rows = data.map((d) => ({ ...d, label: weekdayLabels[d.weekday - 1] ?? String(d.weekday) }));
  const hasData = rows.some((d) => d.count > 0);
  const chartData = pivotByModality(rows);
  const present = modalityCodesPresent(rows);
  const colorMap = buildModalityColorMap(modalityCatalog.map((m) => m.code));
  const codesToName = new Map(present.map((p) => [p.code, p.name]));

  if (!mounted) return <section className="card" style={{ padding: 20, minHeight: 260 }} />;

  return (
    <ChartFrame title={title} empty={!hasData} noDataLabel={noDataLabel} info={info}>
      <div style={{ width: "100%", minWidth: 0 }}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} stroke="var(--border)" />
            <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 11 }} stroke="var(--border)" allowDecimals={false} />
            <Tooltip
              cursor={{ fill: "var(--bg-tertiary, rgba(128,128,128,0.1))" }}
              contentStyle={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}
              formatter={(value, name) => tooltipFormatter(value as number, String(name), codesToName)}
            />
            <Legend formatter={(value) => codesToName.get(value) ?? value} />
            {present.map((m) => (
              <Bar key={m.code} dataKey={m.code} stackId="checkins" name={m.code} fill={colorMap[m.code] ?? "var(--primary)"} radius={[0, 0, 0, 0]} />
            ))}
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
  modalityCatalog,
}: {
  data: WeekDatum[];
  title: string;
  noDataLabel: string;
  info: string;
  modalityCatalog: ModalityCatalogEntry[];
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const rows = data.map((d) => ({ ...d, label: `${d.weekStart.slice(8, 10)}/${d.weekStart.slice(5, 7)}` }));
  const hasData = rows.some((d) => d.count > 0);
  const chartData = pivotByModality(rows);
  const present = modalityCodesPresent(rows);
  const colorMap = buildModalityColorMap(modalityCatalog.map((m) => m.code));
  const codesToName = new Map(present.map((p) => [p.code, p.name]));

  if (!mounted) return <section className="card" style={{ padding: 20, minHeight: 260 }} />;

  return (
    <ChartFrame title={title} empty={!hasData} noDataLabel={noDataLabel} info={info}>
      <div style={{ width: "100%", minWidth: 0 }}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} stroke="var(--border)" />
            <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 11 }} stroke="var(--border)" allowDecimals={false} />
            <Tooltip
              cursor={{ fill: "var(--bg-tertiary, rgba(128,128,128,0.1))" }}
              contentStyle={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}
              formatter={(value, name) => tooltipFormatter(value as number, String(name), codesToName)}
            />
            <Legend formatter={(value) => codesToName.get(value) ?? value} />
            {present.map((m) => (
              <Bar key={m.code} dataKey={m.code} stackId="evaluations" name={m.code} fill={colorMap[m.code] ?? "var(--primary)"} radius={[0, 0, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}
