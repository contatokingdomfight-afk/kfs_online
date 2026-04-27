"use client";

import { useCallback, useMemo, useState } from "react";
import type { PhysicalAssessmentFormData } from "@/lib/physical-assessment-types";
import {
  type AnatomicalBodyMapRegionId,
  anatomicalBodyMapHasAnyRegionData,
  anatomicalBodyMapOverall,
  anatomicalBodyMapRegionLabels,
  buildAnatomicalBodyMapRegions,
} from "@/lib/anatomical-body-map-from-form";
import { computeAnatomicalIllustrationTransform } from "@/lib/anatomical-body-illustration-transform";
import {
  hasIllustrativeAnthropometry,
  normalizePhysicalFormDataJson,
  type ProfileBodyMetrics,
} from "@/lib/illustrative-body-silhouette";

type ViewSide = "front" | "back";

/** Servidos em `public/` — fora do SW (ver `public/sw.js`) para carregar na PWA. */
const ANATOMICAL_PUBLIC_FRONT = "/anatomical-body/front.svg";
const ANATOMICAL_PUBLIC_BACK = "/anatomical-body/back.svg";

const FRONT_REGIONS: AnatomicalBodyMapRegionId[] = [
  "head",
  "neck",
  "chest",
  "abdomen",
  "leftArm",
  "rightArm",
  "leftLeg",
  "rightLeg",
];

const BACK_REGIONS: AnatomicalBodyMapRegionId[] = [
  "head",
  "trapezius",
  "upperBack",
  "lowerBack",
  "leftArm",
  "rightArm",
  "glutes",
  "leftLeg",
  "rightLeg",
];

const hitShapeClass = [
  "cursor-pointer fill-transparent stroke-transparent [stroke-width:1.2] transition-[fill,stroke] duration-150",
  "hover:fill-[rgba(29,158,117,0.28)] hover:stroke-[#0F6E56]",
  "focus:outline-none focus-visible:stroke-[#0F6E56] focus-visible:fill-[rgba(29,158,117,0.2)]",
  "[&:focus-visible]:outline [&:focus-visible]:outline-2 [&:focus-visible]:outline-primary/50 [&:focus-visible]:outline-offset-2",
].join(" ");

function Hotspot({
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
}) {
  return (
    <path
      data-region={region}
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
}) {
  return (
    <ellipse
      data-region={region}
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
  onPick: (r: AnatomicalBodyMapRegionId) => void;
  onHover: (r: AnatomicalBodyMapRegionId | null) => void;
  active: AnatomicalBodyMapRegionId | null;
  labels: Record<AnatomicalBodyMapRegionId, string>;
}) {
  const { onPick, onHover, active, labels } = props;
  return (
    <>
      <HotspotEllipse region="head" active={active === "head"} cx={100} cy={24} rx={15} ry={20} onPick={onPick} onHover={onHover} labels={labels} />
      <Hotspot region="neck" active={active === "neck"} d="M92,46 L108,46 L110,62 L90,62 Z" onPick={onPick} onHover={onHover} labels={labels} />
      <Hotspot
        region="chest"
        active={active === "chest"}
        d="M76,64 Q80,62 88,62 L112,62 Q120,62 124,64 L126,112 Q120,116 100,116 Q80,116 74,112 Z"
        onPick={onPick}
        onHover={onHover}
        labels={labels}
      />
      <Hotspot region="abdomen" active={active === "abdomen"} d="M80,116 L120,116 L122,168 Q110,172 100,172 Q90,172 78,168 Z" onPick={onPick} onHover={onHover} labels={labels} />
      <Hotspot
        region="leftArm"
        active={active === "leftArm"}
        d="M72,68 L78,68 Q72,90 66,118 L58,160 Q54,185 50,200 L42,200 Q40,178 44,150 L52,108 Q58,82 72,68 Z"
        onPick={onPick}
        onHover={onHover}
        labels={labels}
      />
      <Hotspot
        region="rightArm"
        active={active === "rightArm"}
        d="M128,68 L122,68 Q128,90 134,118 L142,160 Q146,185 150,200 L158,200 Q160,178 156,150 L148,108 Q142,82 128,68 Z"
        onPick={onPick}
        onHover={onHover}
        labels={labels}
      />
      <Hotspot
        region="leftLeg"
        active={active === "leftLeg"}
        d="M80,172 Q90,176 100,176 L100,260 L96,330 L91,360 L80,358 L76,320 L72,260 Q72,210 76,190 Z"
        onPick={onPick}
        onHover={onHover}
        labels={labels}
      />
      <Hotspot
        region="rightLeg"
        active={active === "rightLeg"}
        d="M100,176 Q110,176 120,172 L124,190 Q128,210 128,260 L124,320 L120,358 L109,360 L104,330 L100,260 Z"
        onPick={onPick}
        onHover={onHover}
        labels={labels}
      />
    </>
  );
}

function HotspotsBack(props: {
  onPick: (r: AnatomicalBodyMapRegionId) => void;
  onHover: (r: AnatomicalBodyMapRegionId | null) => void;
  active: AnatomicalBodyMapRegionId | null;
  labels: Record<AnatomicalBodyMapRegionId, string>;
}) {
  const { onPick, onHover, active, labels } = props;
  return (
    <>
      <HotspotEllipse region="head" active={active === "head"} cx={101} cy={32} rx={15} ry={22} onPick={onPick} onHover={onHover} labels={labels} />
      <Hotspot
        region="trapezius"
        active={active === "trapezius"}
        d="M74,58 Q88,54 101,54 Q114,54 128,58 L130,88 L101,92 L72,88 Z"
        onPick={onPick}
        onHover={onHover}
        labels={labels}
      />
      <Hotspot region="upperBack" active={active === "upperBack"} d="M72,88 L130,88 L132,146 L70,146 Z" onPick={onPick} onHover={onHover} labels={labels} />
      <Hotspot region="lowerBack" active={active === "lowerBack"} d="M74,146 L128,146 L128,188 L74,188 Z" onPick={onPick} onHover={onHover} labels={labels} />
      <Hotspot
        region="leftArm"
        active={active === "leftArm"}
        d="M70,72 L78,72 Q72,95 66,125 L58,165 Q54,190 50,205 L42,205 Q40,180 44,155 L52,115 Q58,88 70,72 Z"
        onPick={onPick}
        onHover={onHover}
        labels={labels}
      />
      <Hotspot
        region="rightArm"
        active={active === "rightArm"}
        d="M130,72 L122,72 Q128,95 134,125 L142,165 Q146,190 150,205 L158,205 Q160,180 156,155 L148,115 Q142,88 130,72 Z"
        onPick={onPick}
        onHover={onHover}
        labels={labels}
      />
      <Hotspot
        region="glutes"
        active={active === "glutes"}
        d="M76,188 L126,188 Q130,208 128,230 L101,234 L74,230 Q72,208 76,188 Z"
        onPick={onPick}
        onHover={onHover}
        labels={labels}
      />
      <Hotspot
        region="leftLeg"
        active={active === "leftLeg"}
        d="M76,230 Q88,234 101,234 L100,310 L96,358 L80,360 L74,320 L70,265 Q70,242 76,230 Z"
        onPick={onPick}
        onHover={onHover}
        labels={labels}
      />
      <Hotspot
        region="rightLeg"
        active={active === "rightLeg"}
        d="M101,234 Q114,234 126,230 Q132,242 132,265 L128,320 L121,360 L106,358 L100,310 Z"
        onPick={onPick}
        onHover={onHover}
        labels={labels}
      />
    </>
  );
}

export type AnatomicalBodyMapVariant = "full" | "compact";

type Props = {
  /** Objeto ficha ou JSON bruto (ex. vindo da BD). */
  formData: unknown;
  locale: "pt" | "en";
  assessedAtLabel?: string | null;
  className?: string;
  variant?: AnatomicalBodyMapVariant;
  /**
   * Força escala «neutra» (só perfil altura/peso quando existir).
   * Quando `true`, ignora antropometria fina para o `transform` da ilustração.
   */
  neutralReference?: boolean;
  profileBodyMetrics?: ProfileBodyMetrics | null;
};

export function AnatomicalBodyMap({
  formData,
  locale,
  assessedAtLabel,
  className,
  variant = "full",
  neutralReference = false,
  profileBodyMetrics = null,
}: Props) {
  const [view, setView] = useState<ViewSide>("front");
  const [pinned, setPinned] = useState<AnatomicalBodyMapRegionId | null>(null);
  const [hover, setHover] = useState<AnatomicalBodyMapRegionId | null>(null);

  const fd = useMemo((): Partial<PhysicalAssessmentFormData> => normalizePhysicalFormDataJson(formData) ?? {}, [formData]);

  const labels = useMemo(() => anatomicalBodyMapRegionLabels(locale), [locale]);
  const regions = useMemo(() => buildAnatomicalBodyMapRegions(fd, locale), [fd, locale]);
  const overall = useMemo(() => anatomicalBodyMapOverall(fd, locale), [fd, locale]);
  const hasRegionData = useMemo(() => anatomicalBodyMapHasAnyRegionData(regions), [regions]);

  const useNeutralTransform = neutralReference || !hasIllustrativeAnthropometry(fd);
  const illustrationStyle = useMemo(
    () => computeAnatomicalIllustrationTransform({ formData: fd, profile: profileBodyMetrics, neutralReference: useNeutralTransform }),
    [fd, profileBodyMetrics, useNeutralTransform]
  );

  const L = locale === "pt";
  const compact = variant === "compact";
  const ui = L
    ? {
        title: "Mapa corporal",
        subtitle: compact
          ? "Ilustração ajustada às tuas medidas (aproximada). Toca nas zonas."
          : "Vista ilustrativa das medidas por região; a figura escala de forma aproximada com os dados da ficha (não é imagem clínica nem do teu corpo). Clica ou passa o rato nas zonas.",
        front: "Frontal",
        back: "Dorsal",
        viewGroup: "Vista do mapa corporal",
        panelEyebrow: "Região",
        panelEmpty: "Escolhe uma zona no esquema para ver os dados registados.",
        noData: "Sem dados por região nesta ficha (preenche antropometria ou observações de postura/mobilidade).",
        summary: "Resumo",
        stageFrontAria: "Mapa corporal — vista frontal, zonas clicáveis",
        stageBackAria: "Mapa corporal — vista dorsal, zonas clicáveis",
      }
    : {
        title: "Body map",
        subtitle: compact
          ? "Illustration scaled to your measures (approximate). Tap a zone."
          : "Illustrative measures by region; the figure scales approximately from your assessment (not clinical imaging or your body). Click or hover the zones.",
        front: "Front",
        back: "Back",
        viewGroup: "Body map view",
        panelEyebrow: "Region",
        panelEmpty: "Select an area on the figure to see recorded data.",
        noData: "No per-region data on this form (add anthropometry or posture/mobility notes).",
        summary: "Summary",
        stageFrontAria: "Body map — front view, clickable zones",
        stageBackAria: "Body map — back view, clickable zones",
      };

  const activeRegion = pinned ?? hover;
  const allowed = view === "front" ? FRONT_REGIONS : BACK_REGIONS;
  const activeAllowed = activeRegion && allowed.includes(activeRegion) ? activeRegion : null;
  const panelRows = activeAllowed ? regions[activeAllowed] : [];

  const onPick = useCallback((r: AnatomicalBodyMapRegionId) => {
    setPinned((prev) => (prev === r ? null : r));
  }, []);

  const showMap = hasRegionData || overall.weight != null || overall.height != null || overall.bmi != null;
  if (!showMap) {
    return (
      <div className={["rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 text-sm text-[var(--text-secondary)]", className ?? ""].join(" ")}>
        <p className="m-0 font-medium text-[var(--text-primary)]">{ui.title}</p>
        <p className="m-0 mt-1">{ui.noData}</p>
      </div>
    );
  }

  const outerPad = compact ? "p-3 space-y-3" : "p-4 space-y-4";
  const stageMax = compact ? "max-w-[240px]" : "max-w-[280px]";

  return (
    <div className={["rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]", outerPad, className].filter(Boolean).join(" ")}>
      {!compact ? (
        <div>
          <p className="m-0 text-base font-semibold text-[var(--text-primary)]">{ui.title}</p>
          <p className="m-0 mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">{ui.subtitle}</p>
          {assessedAtLabel?.trim() ? (
            <p className="m-0 mt-1 text-[11px] text-[var(--text-secondary)]">
              {L ? "Dados da avaliação:" : "Assessment data:"} {assessedAtLabel.trim()}
            </p>
          ) : null}
        </div>
      ) : assessedAtLabel?.trim() ? (
        <p className="m-0 text-[11px] text-[var(--text-secondary)]">
          {L ? "Avaliação:" : "Assessment:"} {assessedAtLabel.trim()}
        </p>
      ) : null}

      {compact ? <p className="m-0 text-[11px] text-[var(--text-secondary)] leading-relaxed">{ui.subtitle}</p> : null}

      <div className={compact ? "grid gap-3 grid-cols-1" : "grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr] lg:items-start"}>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] p-3">
          <div className="mb-3 flex rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-0.5" role="group" aria-label={ui.viewGroup}>
            {(["front", "back"] as const).map((v) => {
              const on = view === v;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    setView(v);
                    setPinned(null);
                    setHover(null);
                  }}
                  className={[
                    "flex-1 rounded-md px-2 py-2 text-xs font-medium transition-colors",
                    on ? "bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                  ].join(" ")}
                >
                  {v === "front" ? ui.front : ui.back}
                </button>
              );
            })}
          </div>

          <div
            className={["relative mx-auto w-full aspect-[200/369]", stageMax].join(" ")}
            aria-label={view === "front" ? ui.stageFrontAria : ui.stageBackAria}
          >
            <div className="absolute inset-0 transition-transform duration-300 ease-out" style={illustrationStyle}>
              <img
                src={view === "front" ? ANATOMICAL_PUBLIC_FRONT : ANATOMICAL_PUBLIC_BACK}
                alt=""
                width={200}
                height={369}
                decoding="async"
                fetchPriority="low"
                className="pointer-events-none absolute inset-0 h-full w-full object-contain [filter:sepia(0.12)_hue-rotate(-8deg)_saturate(0.9)_contrast(0.95)]"
              />
              <svg
                className="absolute inset-0 h-full w-full"
                viewBox="0 0 200 369"
                preserveAspectRatio="xMidYMid meet"
                role="presentation"
              >
                {view === "front" ? (
                  <HotspotsFront onPick={onPick} onHover={setHover} active={activeAllowed} labels={labels} />
                ) : (
                  <HotspotsBack onPick={onPick} onHover={setHover} active={activeAllowed} labels={labels} />
                )}
              </svg>
            </div>
          </div>
        </div>

        <div className="space-y-3 min-w-0">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] p-4">
            <p className="m-0 text-xs text-[var(--text-secondary)]">{ui.panelEyebrow}</p>
            <p className="m-0 mt-0.5 text-base font-semibold text-[var(--text-primary)]">
              {activeAllowed ? labels[activeAllowed] : ui.panelEmpty}
            </p>
            {panelRows.length > 0 ? (
              <ul className="mt-3 list-none space-y-2 p-0 m-0">
                {panelRows.map((row, i) => (
                  <li key={i} className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 text-sm">
                    <span className="text-[var(--text-secondary)]">{row.label}</span>
                    <span className="font-medium text-[var(--text-primary)] text-right">{row.value}</span>
                  </li>
                ))}
              </ul>
            ) : activeAllowed ? (
              <p className="m-0 mt-2 text-sm text-[var(--text-secondary)]">—</p>
            ) : null}
          </div>

          <div className="rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] p-3">
            <p className="m-0 text-xs text-[var(--text-secondary)] mb-2">{ui.summary}</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md bg-[var(--bg-secondary)] px-2 py-2">
                <p className="m-0 text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">{overall.weightLabel}</p>
                <p className="m-0 mt-0.5 text-sm font-semibold text-[var(--text-primary)]">{overall.weight ?? "—"}</p>
              </div>
              <div className="rounded-md bg-[var(--bg-secondary)] px-2 py-2">
                <p className="m-0 text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">{overall.heightLabel}</p>
                <p className="m-0 mt-0.5 text-sm font-semibold text-[var(--text-primary)]">{overall.height ?? "—"}</p>
              </div>
              <div className="rounded-md bg-[var(--bg-secondary)] px-2 py-2">
                <p className="m-0 text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">{overall.bmiLabel}</p>
                <p className="m-0 mt-0.5 text-sm font-semibold text-[var(--text-primary)]">{overall.bmi ?? "—"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
