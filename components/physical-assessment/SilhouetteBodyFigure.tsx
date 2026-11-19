"use client";

import { useId, useMemo } from "react";
import type { BodyMeasures, BodySex } from "@/lib/body-map/measures";
import {
  buildSilhouetteModel,
  FEMALE_HAIR_BEHIND_D,
  FEMALE_HAIR_FRONT_DS,
  silhouetteFactors,
  type LinePath,
} from "@/lib/body-map/silhouette";
import { regionMarkStyle } from "@/lib/body-map/marks";
import { REGION_STATUS_COLOR, type BodyMapFigureCommonProps } from "@/lib/body-map/status";

type Props = BodyMapFigureCommonProps & {
  sex: BodySex;
  /** Medidas da ficha; vazio = corpo de referência. */
  measures: BodyMeasures;
  /** 0..1 — quanto se veem as separações musculares (menos com mais gordura corporal). */
  definition: number;
};

const MIRROR = "translate(200 0) scale(-1 1)";

function Lines({ lines }: { lines: LinePath[] }) {
  return (
    <>
      {lines.map((l, i) => (
        <path key={i} d={l.d} transform={l.mirror ? MIRROR : undefined} />
      ))}
    </>
  );
}

/** Vista «Silhueta»: figura vetorial em tons de grafite, deformada pelas medidas e com zonas clicáveis. */
export function SilhouetteBodyFigure({ view, sex, measures, definition, status, active, onPick, onHover, labels, ariaLabel, marks }: Props) {
  const id = `sbf-${useId().replace(/\W/g, "")}`;
  const model = useMemo(() => buildSilhouetteModel(view, sex, silhouetteFactors(measures, sex)), [view, sex, measures]);
  const female = sex === "f";
  const capFill = female ? "#2b2622" : "#23262c";

  return (
    <svg className="h-full w-full" viewBox="0 0 200 400" preserveAspectRatio="xMidYMid meet" role="group" aria-label={ariaLabel}>
      <defs>
        <clipPath id={`${id}c`}>
          <path d={model.body} />
        </clipPath>
        <linearGradient id={`${id}v`} x1="0" y1="0" x2=".9" y2="1">
          <stop offset="0" stopColor="#9aa2b0" />
          <stop offset=".45" stopColor="#6a7280" />
          <stop offset="1" stopColor="#3a404a" />
        </linearGradient>
        <filter id={`${id}b1`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
        <filter id={`${id}b3`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id={`${id}b5`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="4.5" />
        </filter>
      </defs>

      <ellipse cx="100" cy="394" rx={model.shadowRx} ry="4.5" fill="#000" opacity=".5" filter={`url(#${id}b3)`} />
      {female && view === "front" ? <path d={FEMALE_HAIR_BEHIND_D} fill="#2b2622" pointerEvents="none" /> : null}
      <path d={model.body} fill={`url(#${id}v)`} pointerEvents="none" />

      <g clipPath={`url(#${id}c)`}>
        {model.zones.map((z) => {
          const st = status[z.region];
          const isActive = active === z.region;
          return (
            <g
              key={z.region}
              data-region={z.region}
              role="button"
              tabIndex={0}
              aria-label={labels[z.region]}
              className="cursor-pointer outline-none"
              fill={REGION_STATUS_COLOR[st]}
              fillOpacity={isActive ? 0.55 : st === "none" ? 0.001 : st === "warn" ? 0.42 : 0.2}
              style={{ mixBlendMode: "color", pointerEvents: "all" }}
              onMouseEnter={() => onHover(z.region)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(z.region)}
              onBlur={() => onHover(null)}
              onClick={() => onPick(z.region)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onPick(z.region);
                }
              }}
            >
              {z.ds.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </g>
          );
        })}

        {model.zones.map((z) => {
          const ms = regionMarkStyle(marks, z.region, view);
          if (!ms) return null;
          return (
            <g
              key={`mark-${z.region}`}
              pointerEvents="none"
              fill={ms.color}
              fillOpacity={ms.opacity}
              stroke={ms.hasPain ? "#fecaca" : "#c4b5fd"}
              strokeWidth="1.1"
              strokeDasharray={ms.dashed ? "3 2" : undefined}
            >
              {z.ds.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </g>
          );
        })}

        <g pointerEvents="none">
          {!female ? (
            view === "front" ? (
              <ellipse cx="100" cy="13" rx="18" ry="8" fill={capFill} filter={`url(#${id}b1)`} />
            ) : (
              <ellipse cx="100" cy="22" rx="20" ry="19" fill={capFill} filter={`url(#${id}b1)`} />
            )
          ) : view === "front" ? (
            <g fill={capFill} filter={`url(#${id}b1)`}>
              {FEMALE_HAIR_FRONT_DS.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </g>
          ) : null}

          <g fill="#fff" opacity=".13" filter={`url(#${id}b3)`}>
            {model.hl.map((e, i) => (
              <ellipse key={i} cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry} />
            ))}
            <g opacity={definition}>
              {model.defHl.map((e, i) => (
                <ellipse key={i} cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry} />
              ))}
            </g>
          </g>
          <g fill="none" stroke="#000" strokeOpacity=".5" strokeWidth="2.4" strokeLinecap="round" filter={`url(#${id}b1)`}>
            <Lines lines={model.lines} />
            <g opacity={definition}>
              <Lines lines={model.defLines} />
            </g>
          </g>
          <g fill="none" stroke="#fff" strokeOpacity=".12" strokeWidth=".6" strokeLinecap="round" transform="translate(.7 .7)">
            <Lines lines={model.lines} />
            <g opacity={definition}>
              <Lines lines={model.defLines} />
            </g>
          </g>
          {view === "front" ? <ellipse cx="100" cy="170" rx="1.3" ry="2" fill="#000" opacity=".45" /> : null}
          <path d={model.body} fill="none" stroke="#000" strokeOpacity=".55" strokeWidth="10" filter={`url(#${id}b5)`} transform="translate(1.5 1)" />
          <path d={model.body} fill="none" stroke="#dfe9ff" strokeOpacity=".35" strokeWidth="2.2" filter={`url(#${id}b1)`} transform="translate(1.6 .8)" />
        </g>

        {active ? (
          <g fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="1.4" pointerEvents="none">
            {model.zones
              .filter((z) => z.region === active)
              .flatMap((z) => z.ds)
              .map((d, i) => (
                <path key={i} d={d} />
              ))}
          </g>
        ) : null}
      </g>

      {female && view === "back" ? (
        <g pointerEvents="none">
          <path d={FEMALE_HAIR_BEHIND_D} fill="#2b2622" />
          <path d={FEMALE_HAIR_BEHIND_D} fill="none" stroke="#000" strokeOpacity=".4" strokeWidth="5" filter={`url(#${id}b3)`} />
        </g>
      ) : null}
      <path d={model.body} fill="none" stroke="#aab2c0" strokeOpacity=".45" strokeWidth=".7" pointerEvents="none" />
    </svg>
  );
}
