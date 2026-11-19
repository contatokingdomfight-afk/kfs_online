"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { ClassicBodyFigure } from "@/components/physical-assessment/ClassicBodyFigure";
import { SilhouetteBodyFigure } from "@/components/physical-assessment/SilhouetteBodyFigure";
import { InlineInfoTip } from "@/components/ui/InlineInfoTip";
import type { PhysicalAssessmentFormData } from "@/lib/physical-assessment-types";
import {
  type AnatomicalBodyMapRegionId,
  anatomicalBodyMapHasAnyRegionData,
  anatomicalBodyMapOverall,
  anatomicalBodyMapRegionLabels,
  buildAnatomicalBodyMapRegions,
} from "@/lib/anatomical-body-map-from-form";
import { buildBodyMarks, marksForRegion, type PainReportInput, type StudentInjuryInput } from "@/lib/body-map/marks";
import { bodyDefinition, bodyMeasuresFromForm, type BodyMeasures } from "@/lib/body-map/measures";
import { regionStatuses } from "@/lib/body-map/status";
import { normalizePhysicalFormDataJson, type ProfileBodyMetrics } from "@/lib/illustrative-body-silhouette";

type ViewSide = "front" | "back";
type BodyStyle = "muscle" | "silhouette" | "anatomical";

/** A «Visão muscular» é sempre a primeira vista que o aluno vê ao abrir o mapa. */
const BODY_STYLES: BodyStyle[] = ["muscle", "silhouette", "anatomical"];
/** Distância horizontal mínima (px) para um arrasto contar como «passar à vista seguinte». */
const SWIPE_MIN_PX = 48;
const NO_MEASURES: BodyMeasures = {};
const EMPTY_PAINS: readonly PainReportInput[] = [];
const EMPTY_INJURIES: readonly StudentInjuryInput[] = [];

/** «Visão muscular»: carregada só quando é mostrada (os dados dos músculos são pesados). */
const MuscleBodyFigure = dynamic(() => import("@/components/physical-assessment/MuscleBodyFigure"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-lg bg-white/5" aria-hidden />,
});

const FRONT_REGIONS: AnatomicalBodyMapRegionId[] = ["head", "neck", "chest", "abdomen", "leftArm", "rightArm", "leftLeg", "rightLeg"];

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

export type AnatomicalBodyMapVariant = "full" | "compact";

type Props = {
  /** Objeto ficha ou JSON bruto (ex. vindo da BD). */
  formData: unknown;
  locale: "pt" | "en";
  assessedAtLabel?: string | null;
  className?: string;
  variant?: AnatomicalBodyMapVariant;
  /**
   * Força o corpo de referência (sem deformar pelas medidas da ficha).
   * Útil quando as medidas não são fiáveis ou se quer comparar com o corpo base.
   */
  neutralReference?: boolean;
  profileBodyMetrics?: ProfileBodyMetrics | null;
  /** Dores recentes do aluno (Bem-estar › Dores); juntam-se às lesões da ficha. */
  pains?: readonly PainReportInput[];
  /** Lesões anteriores que o aluno declarou (Bem-estar › Dores e lesões); juntam-se às da ficha. */
  studentInjuries?: readonly StudentInjuryInput[];
  /**
   * Aluno ainda sem avaliação física: só a Visão muscular com o corpo de referência, as dores/lesões que já
   * conhecemos e altura/peso do perfil. Ao tocar numa zona convida a fazer a avaliação física.
   */
  generic?: boolean;
  /** Para onde leva o convite «fazer avaliação física» (modo genérico). */
  scheduleHref?: string;
};

export function AnatomicalBodyMap({
  formData,
  locale,
  assessedAtLabel,
  className,
  variant = "full",
  neutralReference = false,
  profileBodyMetrics = null,
  pains = EMPTY_PAINS,
  studentInjuries = EMPTY_INJURIES,
  generic = false,
  scheduleHref = "/dashboard/ficha-fisica",
}: Props) {
  const [view, setView] = useState<ViewSide>("front");
  const [styleChoice, setStyleChoice] = useState<BodyStyle>("muscle");
  const [pinned, setPinned] = useState<AnatomicalBodyMapRegionId | null>(null);
  const [hover, setHover] = useState<AnatomicalBodyMapRegionId | null>(null);

  const bodyStyle: BodyStyle = generic ? "muscle" : styleChoice;

  /** Alterna entre frontal e dorsal (arrastar para o lado, setas e pontos). */
  const flipView = useCallback(() => {
    setView((v) => (v === "front" ? "back" : "front"));
    setPinned(null);
    setHover(null);
  }, []);

  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  const fd = useMemo((): Partial<PhysicalAssessmentFormData> => (generic ? {} : (normalizePhysicalFormDataJson(formData) ?? {})), [formData, generic]);

  const labels = useMemo(() => anatomicalBodyMapRegionLabels(locale), [locale]);
  const regions = useMemo(() => buildAnatomicalBodyMapRegions(fd, locale), [fd, locale]);
  const statuses = useMemo(() => regionStatuses(regions), [regions]);
  const overall = useMemo(() => anatomicalBodyMapOverall(fd, locale, profileBodyMetrics), [fd, locale, profileBodyMetrics]);
  const hasRegionData = useMemo(() => anatomicalBodyMapHasAnyRegionData(regions), [regions]);
  const marks = useMemo(() => buildBodyMarks({ pains, injuries: fd.injuries, studentInjuries, locale }), [pains, fd.injuries, studentInjuries, locale]);

  const { sex, measures: formMeasures } = useMemo(() => bodyMeasuresFromForm(fd), [fd]);
  const measures = generic || neutralReference ? NO_MEASURES : formMeasures;
  const definition = useMemo(() => bodyDefinition(fd.bodyFatPct, sex), [fd.bodyFatPct, sex]);

  const L = locale === "pt";
  const compact = variant === "compact";
  const ui = L
    ? {
        title: "Mapa corporal",
        subtitle: generic
          ? "Corpo de referência: ainda não tens avaliação física. Aqui vês o que já sabemos de ti — dores recentes, altura e peso. Toca nas zonas."
          : compact
            ? "Figura ajustada às tuas medidas (aproximada). Toca nas zonas."
            : "Vista ilustrativa das medidas por região; a figura ajusta-se de forma aproximada aos dados da ficha (não é imagem clínica nem do teu corpo). Clica ou passa o rato nas zonas.",
        front: "Frontal",
        back: "Dorsal",
        viewGroup: "Vista do mapa corporal",
        styleGroup: "Estilo da figura",
        silhouette: "Silhueta",
        muscle: "Visão muscular",
        anatomical: "Anatómica",
        seeBack: "Ver dorsal",
        seeFront: "Ver frontal",
        swipeToBack: "Desliza para o lado para ver as costas",
        swipeToFront: "Desliza para o lado para ver a frente",
        panelEyebrow: "Região",
        panelEmpty: "Escolhe uma zona no esquema para ver os dados registados.",
        noData: "Sem dados por região nesta ficha (preenche antropometria ou observações de postura/mobilidade).",
        summary: "Resumo",
        stageFrontAria: "Mapa corporal — vista frontal, zonas clicáveis",
        stageBackAria: "Mapa corporal — vista dorsal, zonas clicáveis",
        legendOk: "Com dados",
        legendWarn: "A vigiar",
        legendNone: "Sem dados",
        legendPain: "Dor recente",
        legendInjury: "Lesão anterior",
        credit: "Visão muscular: react-native-body-highlighter (MIT).",
        genericNote: "Ainda não temos medidas nem avaliação desta zona. Faz uma avaliação física para teres mais informações.",
        genericCta: "Como agendar a avaliação física",
      }
    : {
        title: "Body map",
        subtitle: generic
          ? "Reference body: you don't have a physical assessment yet. Here is what we already know — recent pain, height and weight. Tap the zones."
          : compact
            ? "Figure scaled to your measures (approximate). Tap a zone."
            : "Illustrative measures by region; the figure adjusts approximately to your assessment (not clinical imaging or your body). Click or hover the zones.",
        front: "Front",
        back: "Back",
        viewGroup: "Body map view",
        styleGroup: "Figure style",
        silhouette: "Silhouette",
        muscle: "Muscle view",
        anatomical: "Anatomical",
        seeBack: "Show back",
        seeFront: "Show front",
        swipeToBack: "Swipe sideways to see the back",
        swipeToFront: "Swipe sideways to see the front",
        panelEyebrow: "Region",
        panelEmpty: "Select an area on the figure to see recorded data.",
        noData: "No per-region data on this form (add anthropometry or posture/mobility notes).",
        summary: "Summary",
        stageFrontAria: "Body map — front view, clickable zones",
        stageBackAria: "Body map — back view, clickable zones",
        legendOk: "Has data",
        legendWarn: "To watch",
        legendNone: "No data",
        legendPain: "Recent pain",
        legendInjury: "Past injury",
        credit: "Muscle view: react-native-body-highlighter (MIT).",
        genericNote: "We don't have measurements or an assessment for this area yet. Book a physical assessment to get more information.",
        genericCta: "How to schedule your physical assessment",
      };

  const activeRegion = pinned ?? hover;
  const allowed = view === "front" ? FRONT_REGIONS : BACK_REGIONS;
  const activeAllowed = activeRegion && allowed.includes(activeRegion) ? activeRegion : null;
  const panelRows = activeAllowed ? [...regions[activeAllowed], ...marksForRegion(marks, activeAllowed).map((m) => m.row)] : [];
  const hasPain = marks.some((m) => m.kind === "pain");
  const hasInjury = marks.some((m) => m.kind === "injury");

  const onPick = useCallback((r: AnatomicalBodyMapRegionId) => {
    setPinned((prev) => (prev === r ? null : r));
  }, []);

  const compactTip = [ui.subtitle, !generic && assessedAtLabel?.trim() ? `${L ? "Avaliação:" : "Assessment:"} ${assessedAtLabel.trim()}` : ""].filter(Boolean).join(" ");

  const showMap = generic || hasRegionData || overall.weight != null || overall.height != null || overall.bmi != null;
  if (!showMap) {
    return (
      <div className={["rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 text-sm text-[var(--text-secondary)]", className ?? ""].join(" ")}>
        <p className="m-0 font-medium text-[var(--text-primary)]">{ui.title}</p>
        <p className="m-0 mt-1">{ui.noData}</p>
      </div>
    );
  }

  const outerPad = compact ? "p-1 space-y-3" : "p-4 space-y-4";
  const stageMax = compact ? "max-w-[360px]" : "max-w-[380px]";
  const classic = bodyStyle === "anatomical";
  const stageRatio = classic ? "aspect-[200/369]" : bodyStyle === "muscle" ? "aspect-[224/400]" : "aspect-[200/400]";
  const styleLabels: Record<BodyStyle, string> = { muscle: ui.muscle, silhouette: ui.silhouette, anatomical: ui.anatomical };
  const ariaLabel = view === "front" ? ui.stageFrontAria : ui.stageBackAria;
  const figureProps = { view, sex, measures, status: statuses, active: activeAllowed, onPick, onHover: setHover, labels, ariaLabel, marks };

  const segmented = (
    items: Array<{ key: string; label: string; on: boolean; onClick: () => void }>,
    groupLabel: string,
    spaced?: boolean,
    desktopOnly?: boolean
  ) => (
    <div
      className={[desktopOnly ? "hidden lg:flex" : "flex", "rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-0.5", spaced ? "mb-2" : "mb-3"].join(" ")}
      role="group"
      aria-label={groupLabel}
    >
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          aria-pressed={it.on}
          onClick={it.onClick}
          className={[
            "flex-1 rounded-md px-2 py-2 text-xs font-medium transition-colors",
            it.on ? "bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
          ].join(" ")}
        >
          {it.label}
        </button>
      ))}
    </div>
  );

  const dot = (color: string, label: string) => (
    <li className="inline-flex items-center gap-1.5">
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </li>
  );

  return (
    <div className={["rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]", outerPad, className].filter(Boolean).join(" ")}>
      {!compact ? (
        <div>
          <p className="m-0 text-base font-semibold text-[var(--text-primary)]">{ui.title}</p>
          <p className="m-0 mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">{ui.subtitle}</p>
          {!generic && assessedAtLabel?.trim() ? (
            <p className="m-0 mt-1 text-[11px] text-[var(--text-secondary)]">
              {L ? "Dados da avaliação:" : "Assessment data:"} {assessedAtLabel.trim()}
            </p>
          ) : null}
        </div>
      ) : null}

      {compact ? (
        <div className="flex justify-end">
          <InlineInfoTip detail={compactTip} ariaLabel={ui.title} />
        </div>
      ) : null}

      <div className={compact ? "grid gap-3 grid-cols-1" : "grid gap-4 lg:grid-cols-[minmax(0,400px)_1fr] lg:items-start"}>
        <div className="min-w-0">
          {generic
            ? null
            : segmented(
                BODY_STYLES.map((s) => ({ key: s, label: styleLabels[s], on: bodyStyle === s, onClick: () => setStyleChoice(s) })),
                ui.styleGroup,
                true
              )}
          {segmented(
            (["front", "back"] as const).map((v) => ({
              key: v,
              label: v === "front" ? ui.front : ui.back,
              on: view === v,
              onClick: () => {
                setView(v);
                setPinned(null);
                setHover(null);
              },
            })),
            ui.viewGroup,
            false,
            true
          )}

          <div className={["relative mx-auto w-full", stageMax].join(" ")}>
            <div
              className={["relative w-full select-none", classic ? "" : "rounded-xl border border-[var(--border)] p-0.5", stageRatio].join(" ")}
              style={{
                touchAction: "pan-y",
                ...(classic ? {} : { background: "radial-gradient(ellipse at 50% 40%, #1d222c 0%, #11141a 72%)" }),
              }}
              onPointerDown={(e) => {
                swipeStart.current = { x: e.clientX, y: e.clientY };
                swiped.current = false;
              }}
              onPointerUp={(e) => {
                const s = swipeStart.current;
                swipeStart.current = null;
                if (!s) return;
                const dx = e.clientX - s.x;
                const dy = e.clientY - s.y;
                if (Math.abs(dx) >= SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
                  swiped.current = true;
                  flipView();
                }
              }}
              onPointerCancel={() => {
                swipeStart.current = null;
              }}
              onClickCapture={(e) => {
                if (swiped.current) {
                  e.stopPropagation();
                  e.preventDefault();
                  swiped.current = false;
                }
              }}
            >
              {bodyStyle === "silhouette" ? (
                <SilhouetteBodyFigure {...figureProps} definition={definition} />
              ) : bodyStyle === "muscle" ? (
                <MuscleBodyFigure {...figureProps} />
              ) : (
                <ClassicBodyFigure
                  view={view}
                  formData={fd}
                  profileBodyMetrics={profileBodyMetrics}
                  neutralReference={neutralReference}
                  active={activeAllowed}
                  onPick={onPick}
                  onHover={setHover}
                  labels={labels}
                  ariaLabel={ariaLabel}
                  marks={marks}
                />
              )}
            </div>
            {(["prev", "next"] as const).map((dir) => (
                  <button
                    key={dir}
                    type="button"
                    aria-label={view === "front" ? ui.seeBack : ui.seeFront}
                    onClick={flipView}
                    className={[
                      "absolute top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full",
                      "border border-white/15 bg-black/45 text-lg leading-none text-white transition-colors hover:bg-black/65",
                      dir === "prev" ? "left-1" : "right-1",
                    ].join(" ")}
                  >
                    {dir === "prev" ? "‹" : "›"}
                  </button>
                ))}
          </div>

          <div className="mt-2 flex items-center justify-center gap-2" role="group" aria-label={ui.viewGroup}>
            {(["front", "back"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-label={v === "front" ? ui.front : ui.back}
                aria-pressed={view === v}
                onClick={() => {
                  if (view !== v) flipView();
                }}
                className={[
                  "h-2 rounded-full transition-all",
                  view === v ? "w-5 bg-[var(--text-primary)]" : "w-2 bg-[var(--text-secondary)] opacity-40 hover:opacity-70",
                ].join(" ")}
              />
            ))}
          </div>
          <p className="m-0 mt-1 text-center text-[11px] text-[var(--text-secondary)]">{view === "front" ? ui.swipeToBack : ui.swipeToFront}</p>

          <ul className="m-0 mt-3 flex list-none flex-wrap justify-center gap-x-4 gap-y-1 p-0 text-[11px] text-[var(--text-secondary)]">
            {classic || generic ? null : (
              <>
                {dot("#1D9E75", ui.legendOk)}
                {dot("#E0A33A", ui.legendWarn)}
                {dot("#5b6170", ui.legendNone)}
              </>
            )}
            {hasPain ? dot("#ef4444", ui.legendPain) : null}
            {hasInjury ? dot("#8b5cf6", ui.legendInjury) : null}
          </ul>
          {bodyStyle === "muscle" ? <p className="m-0 mt-2 text-center text-[10px] text-[var(--text-secondary)] opacity-70">{ui.credit}</p> : null}
        </div>

        <div className="space-y-3 min-w-0">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] p-4">
            <p className="m-0 text-xs text-[var(--text-secondary)]">{ui.panelEyebrow}</p>
            <p className="m-0 mt-0.5 text-base font-semibold text-[var(--text-primary)]">{activeAllowed ? labels[activeAllowed] : ui.panelEmpty}</p>
            {panelRows.length > 0 ? (
              <ul className="mt-3 list-none space-y-2 p-0 m-0">
                {panelRows.map((row, i) => (
                  <li key={i} className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 text-sm">
                    <span className="text-[var(--text-secondary)]">{row.label}</span>
                    <span className="font-medium text-[var(--text-primary)] text-right">{row.value}</span>
                  </li>
                ))}
              </ul>
            ) : activeAllowed && !generic ? (
              <p className="m-0 mt-2 text-sm text-[var(--text-secondary)]">—</p>
            ) : null}
            {generic && activeAllowed ? (
              <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
                <p className="m-0 text-xs leading-relaxed text-[var(--text-secondary)]">{ui.genericNote}</p>
                <Link href={scheduleHref} className="btn btn-primary mt-3 block w-full px-4 py-2 text-center text-sm no-underline">
                  {ui.genericCta}
                </Link>
              </div>
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
