"use client";

import { useState } from "react";
import { RADAR_LABELS, type RadarScores } from "@/lib/performance-utils";

const LEGACY_AXES = ["gas", "technique", "strength", "theory"] as const;
const SIZE = 120;
const CENTER = SIZE / 2;
const PADDING = 28;
const VIEW_SIZE = SIZE + 2 * PADDING;

export type RadarAxis = { id: string; label: string };

type Props =
  | { scores: RadarScores; axes?: undefined; maxScore?: undefined }
  | { scores: Record<string, number>; axes: RadarAxis[]; maxScore: number };

/** Gráfico radar (teia). Modo legado: 4 eixos escala 1–5. Modo dinâmico: eixos e maxScore (1–10) a partir do config. */
export function PerformanceRadar(props: Props) {
  const [hoverAxis, setHoverAxis] = useState<number | null>(null);
  const [hoverPolygon, setHoverPolygon] = useState(false);

  const useDynamic = Array.isArray(props.axes) && props.axes.length > 0 && props.maxScore != null;
  const axes = useDynamic
    ? props.axes!
    : LEGACY_AXES.map((key) => ({ id: key, label: RADAR_LABELS[key] ?? key }));
  const maxScore = useDynamic ? props.maxScore : 5;
  const scores = props.scores as Record<string, number>;

  const points: { x: number; y: number; label: string; value: number }[] = [];
  axes.forEach((axis, i) => {
    const angle = (i * 360) / axes.length - 90;
    const rad = (angle * Math.PI) / 180;
    const value = Math.min(maxScore, Math.max(1, scores[axis.id] ?? 1));
    const r = ((value - 1) / (maxScore - 1)) * (CENTER - 24);
    points.push({
      x: CENTER + r * Math.cos(rad),
      y: CENTER + r * Math.sin(rad),
      label: axis.label,
      value,
    });
  });
  const polygonPoints = points.map((p) => `${p.x},${p.y}`).join(" ");
  const labelPoints = axes.map((axis, i) => {
    const angle = (i * 360) / axes.length - 90;
    const rad = (angle * Math.PI) / 180;
    const r = CENTER - 8;
    return {
      x: CENTER + r * Math.cos(rad),
      y: CENTER + r * Math.sin(rad),
      label: axis.label,
      value: scores[axis.id] ?? 0,
    };
  });

  const gridLevels = maxScore <= 5 ? [1, 2, 3, 4, 5] : [2, 4, 6, 8, 10];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div
        style={{
          transition: "transform 0.2s ease",
          transform: hoverPolygon ? "scale(1.03)" : "scale(1)",
        }}
        onMouseEnter={() => setHoverPolygon(true)}
        onMouseLeave={() => setHoverPolygon(false)}
      >
        <svg
          width={VIEW_SIZE * 2}
          height={VIEW_SIZE * 2}
          viewBox={`${-PADDING} ${-PADDING} ${VIEW_SIZE} ${VIEW_SIZE}`}
          style={{
            maxWidth: 260,
            height: "auto",
            overflow: "visible",
            cursor: "pointer",
          }}
          aria-label={useDynamic ? "Gráfico de performance (média móvel)" : "Gráfico de performance: Gás, Técnica, Força, Teoria"}
        >
        {gridLevels.map((level) => {
          const r = ((level - 1) / (maxScore - 1)) * (CENTER - 24);
          const pts = axes
            .map((_, i) => {
              const angle = (i * 360) / axes.length - 90;
              const rad = (angle * Math.PI) / 180;
              return `${CENTER + r * Math.cos(rad)},${CENTER + r * Math.sin(rad)}`;
            })
            .join(" ");
          return (
            <polygon
              key={level}
              points={pts}
              fill="none"
              stroke="var(--border)"
              strokeWidth="0.5"
            />
          );
        })}
        <polygon
          points={polygonPoints}
          fill="var(--primary)"
          fillOpacity={hoverPolygon ? 0.5 : 0.35}
          stroke="var(--primary)"
          strokeWidth={hoverPolygon ? 2 : 1.5}
          style={{ transition: "fill-opacity 0.2s, stroke-width 0.2s" }}
        />
        {labelPoints.map((p, i) => {
          const isHover = hoverAxis === i;
          const titleText = `${p.label}: ${Number(p.value).toFixed(1)}/${maxScore}`;
          return (
            <g
              key={i}
              onMouseEnter={() => setHoverAxis(i)}
              onMouseLeave={() => setHoverAxis(null)}
              style={{ cursor: "pointer" }}
            >
              <title suppressHydrationWarning>{titleText}</title>
              <text
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="8"
                fill={isHover ? "var(--primary)" : "var(--text-secondary)"}
                fontWeight={isHover ? 600 : 500}
                style={{ transition: "fill 0.15s, font-weight 0.15s" }}
              >
                {p.label.length > 8 ? p.label.slice(0, 6) + "…" : p.label} {p.value}
              </text>
            </g>
          );
        })}
        </svg>
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "clamp(11px, 2.8vw, 13px)", color: "var(--text-secondary)" }}>
        {axes.map((axis) => (
          <li key={axis.id}>
            {axis.label}: {scores[axis.id] ?? 0}/{maxScore}
          </li>
        ))}
      </ul>
    </div>
  );
}
