"use client";

import { useMemo } from "react";
import type { AnatomicalBodyMapRegionId } from "@/lib/anatomical-body-map-from-form";
import { bodyFactors, type BodyMeasures, type BodySex } from "@/lib/body-map/measures";
import { buildMusclePaths, muscleBodyKey, type MusclePath } from "@/lib/body-map/muscle";
import { pathMarkStyle } from "@/lib/body-map/marks";
import { mixHex, REGION_STATUS_COLOR, type BodyMapFigureCommonProps } from "@/lib/body-map/status";

type Props = BodyMapFigureCommonProps & {
  sex: BodySex;
  /** Medidas da ficha; vazio = corpo de referência. */
  measures: BodyMeasures;
};

const SPECIAL: Record<string, string> = {
  hair: "#3a3f4a",
  head: "#a9b3c2",
  hands: "#a9b3c2",
  feet: "#a9b3c2",
  neck: "#8a97aa",
};

/** Vista «Visão muscular»: manequim muscular (cada músculo é uma zona), deformado pelas medidas. */
export default function MuscleBodyFigure({ view, sex, measures, status, active, onPick, onHover, labels, ariaLabel, marks }: Props) {
  const paths = useMemo(() => {
    const has = Object.values(measures).some((v) => typeof v === "number");
    return buildMusclePaths(muscleBodyKey(sex, view), has ? bodyFactors(measures, sex) : null);
  }, [sex, view, measures]);

  const { loose, groups } = useMemo(() => {
    const g = new Map<AnatomicalBodyMapRegionId, MusclePath[]>();
    const l: MusclePath[] = [];
    for (const p of paths) {
      if (!p.region) {
        l.push(p);
        continue;
      }
      const arr = g.get(p.region);
      if (arr) arr.push(p);
      else g.set(p.region, [p]);
    }
    return { loose: l, groups: [...g.entries()] };
  }, [paths]);

  let alt = 0;
  const fillFor = (slug: string, region: AnatomicalBodyMapRegionId | null): string => {
    const special = SPECIAL[slug];
    let fill = special ?? (alt++ % 2 ? "#76849a" : "#8795aa");
    if (region && !special) {
      const st = status[region];
      if (st !== "none") fill = mixHex(fill, REGION_STATUS_COLOR[st], st === "warn" ? 0.55 : 0.38);
    }
    return fill;
  };
  /** Dor (vermelho) ou lesão antiga (violeta tracejado) neste músculo. */
  const markFor = (slug: string, region: AnatomicalBodyMapRegionId | null, base: string) => {
    const m = pathMarkStyle(marks, region, slug);
    if (!m) return { fill: base, stroke: null as string | null, dash: undefined as string | undefined };
    return { fill: mixHex(base, m.color, Math.min(0.9, m.opacity * 1.6)), stroke: m.hasPain ? "#fecaca" : "#c4b5fd", dash: m.hasInjury ? "2.2 1.6" : undefined };
  };

  return (
    <svg className="h-full w-full" viewBox="-12 0 224 400" preserveAspectRatio="xMidYMid meet" role="group" aria-label={ariaLabel}>
      <ellipse cx="100" cy="396" rx="46" ry="3.6" fill="#000" opacity=".5" />
      {loose.map((p, i) => (
        <path key={`l${i}`} data-slug={p.slug} d={p.d} fill={fillFor(p.slug, null)} stroke="#0b0d11" strokeWidth=".6" pointerEvents="none" />
      ))}
      {groups.map(([region, list]) => {
        const isActive = active === region;
        return (
          <g
            key={region}
            data-region={region}
            role="button"
            tabIndex={0}
            aria-label={labels[region]}
            className="cursor-pointer outline-none"
            onMouseEnter={() => onHover(region)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(region)}
            onBlur={() => onHover(null)}
            onClick={() => onPick(region)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onPick(region);
              }
            }}
          >
            {list.map((p, i) => {
              const mk = markFor(p.slug, region, fillFor(p.slug, region));
              return (
                <path
                  key={i}
                  data-slug={p.slug}
                  d={p.d}
                  fill={mk.fill}
                  stroke={isActive ? "#fff" : (mk.stroke ?? "#0b0d11")}
                  strokeWidth={isActive ? 1.4 : mk.stroke ? 1.1 : 0.6}
                  strokeDasharray={isActive ? undefined : mk.dash}
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
