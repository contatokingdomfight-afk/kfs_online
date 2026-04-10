"use client";

import { useMemo } from "react";

export type RadarAxis = { id: string; label: string };

type Props = {
  scores: Record<string, number>;
  axes: RadarAxis[];
  maxScore?: number;
  /** Quando true, renderiza só o gráfico (sem card nem título), para embutir noutra secção. */
  embedded?: boolean;
};

const SIZE = 300;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = SIZE * 0.36;
const LABEL_R = R + 26;
const GRID_LEVELS = [0.25, 0.5, 0.75, 1];

function toXY(angleDeg: number, radius: number): [number, number] {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [CX + radius * Math.cos(rad), CY + radius * Math.sin(rad)];
}

function pts(points: [number, number][]): string {
  return points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
}

export function RadarStats({ scores, axes, maxScore = 10, embedded = false }: Props) {
  const n = axes.length;

  const dataPoints = useMemo(
    () =>
      axes.map((a, i) => {
        const frac = Math.min(1, Math.max(0, (scores[a.id] ?? 0) / maxScore));
        return toXY((360 / n) * i, R * frac);
      }),
    [axes, scores, maxScore, n]
  );

  const avg =
    n > 0
      ? axes.reduce((s, a) => s + Math.min(maxScore, Math.max(0, scores[a.id] ?? 0)), 0) / n
      : 0;

  if (n === 0) return null;

  const chart = (
    <>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full"
        style={{ maxHeight: 300 }}
        aria-hidden="true"
      >
        {/* Grid rings */}
        {GRID_LEVELS.map((level) => (
          <polygon
            key={level}
            points={pts(axes.map((_, i) => toXY((360 / n) * i, R * level)))}
            fill="none"
            stroke="var(--border)"
            strokeWidth="1"
          />
        ))}

        {/* Spokes */}
        {axes.map((_, i) => {
          const [x, y] = toXY((360 / n) * i, R);
          return (
            <line
              key={i}
              x1={CX}
              y1={CY}
              x2={x}
              y2={y}
              stroke="var(--border)"
              strokeWidth="1"
            />
          );
        })}

        {/* Data polygon */}
        <polygon
          points={pts(dataPoints)}
          fill="var(--primary)"
          fillOpacity="0.35"
          stroke="var(--primary)"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Labels */}
        {axes.map((a, i) => {
          const [x, y] = toXY((360 / n) * i, LABEL_R);
          return (
            <text
              key={a.id}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="11"
              fill="var(--text-secondary)"
            >
              {a.label}
            </text>
          );
        })}
      </svg>

      <div className="mt-2 flex justify-center">
        <p className="text-xs text-text-secondary">
          Média geral:{" "}
          <span className="font-semibold text-primary">{avg.toFixed(1)}/10</span>
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
