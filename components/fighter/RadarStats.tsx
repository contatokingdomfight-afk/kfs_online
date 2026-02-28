"use client";

import { useMemo } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export type RadarAxis = { id: string; label: string };

type Props = {
  scores: Record<string, number>;
  axes: RadarAxis[];
  maxScore?: number;
  /** Quando true, renderiza só o gráfico (sem card nem título), para embutir noutra secção. */
  embedded?: boolean;
};

export function RadarStats({ scores, axes, maxScore = 10, embedded = false }: Props) {
  const data = useMemo(() => {
    return axes.map((a) => ({
      subject: a.label,
      value: Math.min(maxScore, Math.max(0, scores[a.id] ?? 0)),
      fullMark: maxScore,
    }));
  }, [scores, axes, maxScore]);

  if (data.length === 0) return null;

  const chart = (
    <>
      <div className="w-full h-[280px] sm:h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
              tickLine={{ stroke: "var(--border)" }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, maxScore]}
              tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
              tickCount={6}
            />
            <Radar
              name="Performance"
              dataKey="value"
              stroke="var(--primary)"
              fill="var(--primary)"
              fillOpacity={0.4}
              strokeWidth={2}
              animationDuration={800}
              animationEasing="ease-out"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
              }}
              labelStyle={{ color: "var(--text-primary)" }}
              formatter={(value: number) => [value.toFixed(1), "Score"]}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex justify-center">
        <p className="text-xs text-text-secondary">
          Média geral:{" "}
          <span className="font-semibold text-primary">
            {(data.reduce((s, d) => s + d.value, 0) / (data.length || 1)).toFixed(1)}/10
          </span>
        </p>
      </div>
    </>
  );

  if (embedded) return <div className="mt-2">{chart}</div>;

  return (
    <div className="rounded-2xl bg-bg-secondary border border-border p-4 sm:p-5 shadow-md">
      <h2 className="text-base font-bold text-text-primary mb-1">Status gerais</h2>
      <p className="text-sm text-text-secondary mb-4">Média das últimas avaliações (1–10)</p>
      {chart}
    </div>
  );
}
