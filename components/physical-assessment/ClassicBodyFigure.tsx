"use client";

import { useId, useMemo, type CSSProperties } from "react";
import { ANATOMICAL_BACK_SVG_INNER, ANATOMICAL_FRONT_SVG_INNER } from "@/components/physical-assessment/generated/anatomical-svg-inners";
import type { PhysicalAssessmentFormData } from "@/lib/physical-assessment-types";
import type { AnatomicalBodyMapRegionId } from "@/lib/anatomical-body-map-from-form";
import { computeAnatomicalIllustrationTransform } from "@/lib/anatomical-body-illustration-transform";
import { hasIllustrativeAnthropometry, type ProfileBodyMetrics } from "@/lib/illustrative-body-silhouette";
import { regionMarkStyle, type BodyMark, type RegionMarkStyle } from "@/lib/body-map/marks";
import type { BodyMapFigureCommonProps } from "@/lib/body-map/status";

const markStyle = (m: RegionMarkStyle | null | undefined): CSSProperties | undefined =>
  m ? { fill: m.color, fillOpacity: m.opacity, stroke: m.hasPain ? "#fecaca" : "#c4b5fd", strokeWidth: 1.2, strokeDasharray: m.dashed ? "3 2" : undefined } : undefined;

/** Realces suaves na cabeça (vista frontal) — por cima da ilustração, por baixo dos hotspots. */
function AnatomicalFrontFaceOverlay({ idBase }: { idBase: string }) {
  const g = `${idBase}-glow`;
  const f = `${idBase}-forehead`;
  const l = `${idBase}-cheek-l`;
  const r = `${idBase}-cheek-r`;
  return (
    <g className="pointer-events-none" aria-hidden>
      <defs>
        <radialGradient id={g} cx="50%" cy="38%" r="58%">
          <stop offset="0%" stopColor="#e8d2c4" stopOpacity="0.55" />
          <stop offset="42%" stopColor="#cfa589" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#1a1512" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={f} cx="50%" cy="28%" r="45%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="70%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={l} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff8f4" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#fff8f4" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={r} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff8f4" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#fff8f4" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="31" rx="20" ry="25" fill={`url(#${g})`} style={{ mixBlendMode: "soft-light" }} />
      <ellipse cx="100" cy="23" rx="12" ry="10" fill={`url(#${f})`} style={{ mixBlendMode: "overlay", opacity: 0.75 }} />
      <ellipse cx="90" cy="33" rx="7" ry="5.5" fill={`url(#${l})`} style={{ mixBlendMode: "soft-light", opacity: 0.9 }} />
      <ellipse cx="110" cy="33" rx="7" ry="5.5" fill={`url(#${r})`} style={{ mixBlendMode: "soft-light", opacity: 0.9 }} />
    </g>
  );
}

const hitShapeClass = [
  "cursor-pointer fill-transparent stroke-transparent [stroke-width:1.2] transition-[fill,stroke] duration-150",
  "hover:fill-[rgba(29,158,117,0.28)] hover:stroke-[#0F6E56]",
  "focus:outline-none focus-visible:stroke-[#0F6E56] focus-visible:fill-[rgba(29,158,117,0.2)]",
  "[&:focus-visible]:outline [&:focus-visible]:outline-2 [&:focus-visible]:outline-primary/50 [&:focus-visible]:outline-offset-2",
].join(" ");

function Hotspot({
  mark,
  region,
  active,
  d,
  onPick,
  onHover,
  labels,
}: {
  region: AnatomicalBodyMapRegionId;
  active: boolean;
  d: string;
  onPick: (r: AnatomicalBodyMapRegionId) => void;
  onHover: (r: AnatomicalBodyMapRegionId | null) => void;
  labels: Record<AnatomicalBodyMapRegionId, string>;
  mark?: RegionMarkStyle | null;
}) {
  return (
    <path
      data-region={region}
      style={markStyle(mark)}
      d={d}
      role="button"
      tabIndex={0}
      aria-label={labels[region]}
      className={[hitShapeClass, active ? "fill-[rgba(29,158,117,0.32)] stroke-[#0F6E56]" : ""].join(" ")}
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
    />
  );
}

function HotspotEllipse({
  mark,
  region,
  active,
  cx,
  cy,
  rx,
  ry,
  onPick,
  onHover,
  labels,
}: {
  region: AnatomicalBodyMapRegionId;
  active: boolean;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  onPick: (r: AnatomicalBodyMapRegionId) => void;
  onHover: (r: AnatomicalBodyMapRegionId | null) => void;
  labels: Record<AnatomicalBodyMapRegionId, string>;
  mark?: RegionMarkStyle | null;
}) {
  return (
    <ellipse
      data-region={region}
      style={markStyle(mark)}
      cx={cx}
      cy={cy}
      rx={rx}
      ry={ry}
      role="button"
      tabIndex={0}
      aria-label={labels[region]}
      className={[hitShapeClass, active ? "fill-[rgba(29,158,117,0.32)] stroke-[#0F6E56]" : ""].join(" ")}
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
    />
  );
}

function HotspotsFront(props: {
  marks: readonly BodyMark[];
  onPick: (r: AnatomicalBodyMapRegionId) => void;
  onHover: (r: AnatomicalBodyMapRegionId | null) => void;
  active: AnatomicalBodyMapRegionId | null;
  labels: Record<AnatomicalBodyMapRegionId, string>;
}) {
  const { onPick, onHover, active, labels, marks } = props;
  const mk = (r: AnatomicalBodyMapRegionId) => regionMarkStyle(marks, r, "front");
  return (
    <>
      <HotspotEllipse mark={mk("head")} region="head" active={active === "head"} cx={100} cy={24} rx={15} ry={20} onPick={onPick} onHover={onHover} labels={labels} />
      <Hotspot mark={mk("neck")} region="neck" active={active === "neck"} d="M92,46 L108,46 L110,62 L90,62 Z" onPick={onPick} onHover={onHover} labels={labels} />
      <Hotspot
        mark={mk("chest")} region="chest"
        active={active === "chest"}
        d="M76,64 Q80,62 88,62 L112,62 Q120,62 124,64 L126,112 Q120,116 100,116 Q80,116 74,112 Z"
        onPick={onPick}
        onHover={onHover}
        labels={labels}
      />
      <Hotspot mark={mk("abdomen")} region="abdomen" active={active === "abdomen"} d="M80,116 L120,116 L122,168 Q110,172 100,172 Q90,172 78,168 Z" onPick={onPick} onHover={onHover} labels={labels} />
      <Hotspot
        mark={mk("rightArm")} region="rightArm"
        active={active === "rightArm"}
        d="M72,68 L78,68 Q72,90 66,118 L58,160 Q54,185 50,200 L42,200 Q40,178 44,150 L52,108 Q58,82 72,68 Z"
        onPick={onPick}
        onHover={onHover}
        labels={labels}
      />
      <Hotspot
        mark={mk("leftArm")} region="leftArm"
        active={active === "leftArm"}
        d="M128,68 L122,68 Q128,90 134,118 L142,160 Q146,185 150,200 L158,200 Q160,178 156,150 L148,108 Q142,82 128,68 Z"
        onPick={onPick}
        onHover={onHover}
        labels={labels}
      />
      <Hotspot
        mark={mk("rightLeg")} region="rightLeg"
        active={active === "rightLeg"}
        d="M80,172 Q90,176 100,176 L100,260 L96,330 L91,360 L80,358 L76,320 L72,260 Q72,210 76,190 Z"
        onPick={onPick}
        onHover={onHover}
        labels={labels}
      />
      <Hotspot
        mark={mk("leftLeg")} region="leftLeg"
        active={active === "leftLeg"}
        d="M100,176 Q110,176 120,172 L124,190 Q128,210 128,260 L124,320 L120,358 L109,360 L104,330 L100,260 Z"
        onPick={onPick}
        onHover={onHover}
        labels={labels}
      />
    </>
  );
}

function HotspotsBack(props: {
  marks: readonly BodyMark[];
  onPick: (r: AnatomicalBodyMapRegionId) => void;
  onHover: (r: AnatomicalBodyMapRegionId | null) => void;
  active: AnatomicalBodyMapRegionId | null;
  labels: Record<AnatomicalBodyMapRegionId, string>;
}) {
  const { onPick, onHover, active, labels, marks } = props;
  const mk = (r: AnatomicalBodyMapRegionId) => regionMarkStyle(marks, r, "back");
  return (
    <>
      <HotspotEllipse mark={mk("head")} region="head" active={active === "head"} cx={101} cy={32} rx={15} ry={22} onPick={onPick} onHover={onHover} labels={labels} />
      <Hotspot
        mark={mk("trapezius")} region="trapezius"
        active={active === "trapezius"}
        d="M74,58 Q88,54 101,54 Q114,54 128,58 L130,88 L101,92 L72,88 Z"
        onPick={onPick}
        onHover={onHover}
        labels={labels}
      />
      <Hotspot mark={mk("upperBack")} region="upperBack" active={active === "upperBack"} d="M72,88 L130,88 L132,146 L70,146 Z" onPick={onPick} onHover={onHover} labels={labels} />
      <Hotspot mark={mk("lowerBack")} region="lowerBack" active={active === "lowerBack"} d="M74,146 L128,146 L128,188 L74,188 Z" onPick={onPick} onHover={onHover} labels={labels} />
      <Hotspot
        mark={mk("leftArm")} region="leftArm"
        active={active === "leftArm"}
        d="M70,72 L78,72 Q72,95 66,125 L58,165 Q54,190 50,205 L42,205 Q40,180 44,155 L52,115 Q58,88 70,72 Z"
        onPick={onPick}
        onHover={onHover}
        labels={labels}
      />
      <Hotspot
        mark={mk("rightArm")} region="rightArm"
        active={active === "rightArm"}
        d="M130,72 L122,72 Q128,95 134,125 L142,165 Q146,190 150,205 L158,205 Q160,180 156,155 L148,115 Q142,88 130,72 Z"
        onPick={onPick}
        onHover={onHover}
        labels={labels}
      />
      <Hotspot
        mark={mk("glutes")} region="glutes"
        active={active === "glutes"}
        d="M76,188 L126,188 Q130,208 128,230 L101,234 L74,230 Q72,208 76,188 Z"
        onPick={onPick}
        onHover={onHover}
        labels={labels}
      />
      <Hotspot
        mark={mk("leftLeg")} region="leftLeg"
        active={active === "leftLeg"}
        d="M76,230 Q88,234 101,234 L100,310 L96,358 L80,360 L74,320 L70,265 Q70,242 76,230 Z"
        onPick={onPick}
        onHover={onHover}
        labels={labels}
      />
      <Hotspot
        mark={mk("rightLeg")} region="rightLeg"
        active={active === "rightLeg"}
        d="M101,234 Q114,234 126,230 Q132,242 132,265 L128,320 L121,360 L106,358 L100,310 Z"
        onPick={onPick}
        onHover={onHover}
        labels={labels}
      />
    </>
  );
}

type Props = Pick<BodyMapFigureCommonProps, "view" | "active" | "onPick" | "onHover" | "labels" | "ariaLabel" | "marks"> & {
  formData: Partial<PhysicalAssessmentFormData>;
  profileBodyMetrics: ProfileBodyMetrics | null;
  neutralReference: boolean;
};

/**
 * Vista «Anatómica» (a original): ilustração anatómica realista, esticada de forma aproximada
 * pelas medidas da ficha, com zonas clicáveis por cima.
 */
export function ClassicBodyFigure({ view, formData, profileBodyMetrics, neutralReference, active, onPick, onHover, labels, ariaLabel, marks }: Props) {
  const faceOverlayIdBase = `abm-face-${useId().replace(/\W/g, "")}`;
  const useNeutralTransform = neutralReference || !hasIllustrativeAnthropometry(formData);
  const illustrationStyle = useMemo(
    () => computeAnatomicalIllustrationTransform({ formData, profile: profileBodyMetrics, neutralReference: useNeutralTransform }),
    [formData, profileBodyMetrics, useNeutralTransform]
  );

  return (
    <svg
      className="absolute inset-0 h-full w-full transition-transform duration-300 ease-out"
      style={illustrationStyle}
      viewBox="0 0 200 369"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={ariaLabel}
    >
      <g
        className="pointer-events-none [filter:sepia(0.09)_hue-rotate(-5deg)_saturate(0.86)_contrast(0.9)_brightness(1.05)]"
        dangerouslySetInnerHTML={{ __html: view === "front" ? ANATOMICAL_FRONT_SVG_INNER : ANATOMICAL_BACK_SVG_INNER }}
      />
      {view === "front" ? <AnatomicalFrontFaceOverlay idBase={faceOverlayIdBase} /> : null}
      {view === "front" ? (
        <HotspotsFront marks={marks} onPick={onPick} onHover={onHover} active={active} labels={labels} />
      ) : (
        <HotspotsBack marks={marks} onPick={onPick} onHover={onHover} active={active} labels={labels} />
      )}
    </svg>
  );
}
