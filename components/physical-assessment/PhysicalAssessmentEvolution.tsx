"use client";

import { useMemo, useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Dot } from "recharts";
import {
  PHYSICAL_EVOLUTION_METRICS,
  buildPhysicalEvolutionSeries,
  getAvailablePhysicalEvolutionMetrics,
  type PhysicalEvolutionRow,
} from "@/lib/physical-assessment-evolution";

type Props = {
  rows: PhysicalEvolutionRow[];
  locale: "pt" | "en";
};

function formatDateLabel(iso: string, locale: "pt" | "en") {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(locale === "pt" ? "pt-PT" : "en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}

function formatValue(v: number, unit: string, locale: "pt" | "en") {
  const rounded = Math.round(v * 100) / 100;
  const str = rounded.toLocaleString(locale === "pt" ? "pt-PT" : "en-GB", { maximumFractionDigits: 2 });
  return `${str} ${unit}`;
}

export function PhysicalAssessmentEvolution({ rows, locale }: Props) {
  const L = locale === "pt";
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const availableMetrics = useMemo(() => getAvailablePhysicalEvolutionMetrics(rows), [rows]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const activeKey = selectedKey && availableMetrics.some((m) => m.key === selectedKey) ? selectedKey : (availableMetrics[0]?.key ?? null);
  const metric = availableMetrics.find((m) => m.key === activeKey) ?? null;

  if (availableMetrics.length === 0 || !metric) return null;

  const series = buildPhysicalEvolutionSeries(rows, metric);
  const chartData = series.map((p) => ({ dateLabel: formatDateLabel(p.assessedAt, locale), value: p.value }));
  const first = series[0].value;
  const last = series[series.length - 1].value;
  const delta = Math.round((last - first) * 100) / 100;
  const isImprovement =
    metric.improvementDirection === "up" ? delta > 0 : metric.improvementDirection === "down" ? delta < 0 : null;
  const deltaColor = isImprovement === true ? "text-green-600 dark:text-green-400" : isImprovement === false ? "text-amber-600 dark:text-amber-400" : "text-text-primary";
  const deltaSign = delta > 0 ? "+" : "";

  const corpoMetrics = PHYSICAL_EVOLUTION_METRICS.filter((m) => m.category === "corpo" && availableMetrics.includes(m));
  const testesMetrics = PHYSICAL_EVOLUTION_METRICS.filter((m) => m.category === "testes" && availableMetrics.includes(m));

  return (
    <section className="rounded-2xl bg-bg-secondary border border-border p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h2 className="text-base font-semibold text-text-primary m-0">
          {L ? "Evolução entre avaliações" : "Evolution across assessments"}
        </h2>
        <select
          value={metric.key}
          onChange={(e) => setSelectedKey(e.target.value)}
          className="input"
          style={{ width: "auto", minWidth: 180 }}
          aria-label={L ? "Escolher métrica" : "Choose metric"}
        >
          {corpoMetrics.length > 0 && (
            <optgroup label={L ? "Medidas corporais" : "Body measurements"}>
              {corpoMetrics.map((m) => (
                <option key={m.key} value={m.key}>
                  {L ? m.labelPt : m.labelEn}
                </option>
              ))}
            </optgroup>
          )}
          {testesMetrics.length > 0 && (
            <optgroup label={L ? "Testes físicos" : "Physical tests"}>
              {testesMetrics.map((m) => (
                <option key={m.key} value={m.key}>
                  {L ? m.labelPt : m.labelEn}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>
      <p className="text-sm text-text-secondary mb-4">
        {L ? "Primeira ficha" : "First record"}: <strong className="text-text-primary">{formatValue(first, metric.unit, locale)}</strong>
        {" → "}
        {L ? "última" : "latest"}: <strong className="text-text-primary">{formatValue(last, metric.unit, locale)}</strong>
        {"  "}
        <span className={deltaColor + " font-medium"}>
          ({deltaSign}
          {formatValue(delta, metric.unit, locale)})
        </span>
      </p>
      {!mounted ? (
        <div style={{ height: 220 }} />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="dateLabel" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} stroke="var(--border)" />
            <YAxis
              tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
              stroke="var(--border)"
              domain={["auto", "auto"]}
              width={44}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}
              labelStyle={{ color: "var(--text-primary)" }}
              formatter={(value) => [formatValue(value as number, metric.unit, locale), L ? metric.labelPt : metric.labelEn]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={<Dot r={4} fill="var(--primary)" stroke="var(--primary)" />}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}
