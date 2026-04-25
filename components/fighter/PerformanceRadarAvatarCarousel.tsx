"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { IllustrativeBodyAvatar } from "@/components/IllustrativeBodyAvatar";
import {
  hasIllustrativeAnthropometry,
  normalizePhysicalFormDataJson,
  type ProfileBodyMetrics,
} from "@/lib/illustrative-body-silhouette";

export type PerformanceAvatarCarouselLabels = {
  sectionTitle: string;
  slideRadarCaption: string;
  slideBodyCaption: string;
  swipeHint: string;
  ariaPrev: string;
  ariaNext: string;
  studentAvatarCaption: string;
  /** Linha curta visível; texto longo fica no tooltip (ícone «i»). */
  studentAvatarCaptionShort: string;
  humanoid3dFootnoteShort: string;
  humanoid3dFootnoteDetail: string;
  humanoid3dOrbitHint: string;
  infoTipAriaSilhouette: string;
  infoTipAriaHumanoid3d: string;
  /** Rótulos da alternância 2D / 3D (`IllustrativeBodyAvatar` quando `allowLazyHumanoid3d`). */
  bodyViewLabel2d: string;
  bodyViewLabel3d: string;
  bodyViewGroupAria: string;
};

const LABEL_DEFAULTS: PerformanceAvatarCarouselLabels = {
  sectionTitle: "Perfil de competências",
  slideRadarCaption: "Radar por dimensão (1–10)",
  slideBodyCaption: "Silhueta da ficha física",
  swipeHint: "",
  ariaPrev: "Anterior",
  ariaNext: "Seguinte",
  studentAvatarCaption: "",
  studentAvatarCaptionShort: "",
  humanoid3dFootnoteShort: "",
  humanoid3dFootnoteDetail: "",
  humanoid3dOrbitHint: "",
  infoTipAriaSilhouette: "Texto completo sobre a silhueta ilustrativa",
  infoTipAriaHumanoid3d: "Texto completo sobre o modelo 3D",
  bodyViewLabel2d: "Silhueta 2D",
  bodyViewLabel3d: "Modelo 3D",
  bodyViewGroupAria: "Tipo de vista da figura",
};

function mergeLabels(labels?: PerformanceAvatarCarouselLabels | null): PerformanceAvatarCarouselLabels {
  return { ...LABEL_DEFAULTS, ...(labels ?? {}) };
}

export type BodySilhouetteMode = "neutral" | "personalized";

type Props = {
  radar: ReactNode;
  formData: unknown;
  assessedAtLabel: string | null;
  labels?: PerformanceAvatarCarouselLabels | null;
  /**
   * Quando definido (ex.: última ficha física na BD), força o 2.º painel: `personalized` usa medidas se existirem;
   * `neutral` mostra silhueta de referência sem antropometria mínima.
   * Omitir mantém o comportamento antigo: 2.º painel só se `formData` tiver ≥2 medidas.
   */
  bodySilhouetteMode?: BodySilhouetteMode | null;
  /** Altura/peso do perfil para escala ilustrativa da silhueta. */
  profileBodyMetrics?: ProfileBodyMetrics | null;
  /** Vista 3D opcional (WebGL); chunk carregado só ao escolher «3D». */
  allowLazyHumanoid3d?: boolean;
};

/**
 * Carrossel horizontal: 1.º painel radar de competências; 2.º silhueta ilustrativa 2D (e opção 3D se `allowLazyHumanoid3d`).
 */
export function PerformanceRadarAvatarCarousel({
  radar,
  formData,
  assessedAtLabel,
  labels,
  bodySilhouetteMode = null,
  profileBodyMetrics = null,
  allowLazyHumanoid3d = false,
}: Props) {
  const L = mergeLabels(labels);

  const parsedForm = normalizePhysicalFormDataJson(formData);
  let silhouetteMode: "off" | "neutral" | "personalized";
  if (bodySilhouetteMode === "neutral") {
    silhouetteMode = "neutral";
  } else if (bodySilhouetteMode === "personalized") {
    silhouetteMode =
      parsedForm != null && hasIllustrativeAnthropometry(parsedForm) ? "personalized" : "neutral";
  } else {
    silhouetteMode =
      parsedForm != null && hasIllustrativeAnthropometry(parsedForm) ? "personalized" : "off";
  }
  const showBodySlide = silhouetteMode !== "off";
  const neutralReference = silhouetteMode === "neutral";
  const formForAvatar = neutralReference ? (parsedForm ?? {}) : (parsedForm ?? formData);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(showBodySlide);

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanPrev(scrollLeft > 4);
    setCanNext(scrollLeft < scrollWidth - clientWidth - 4);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = scrollerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => updateArrows());
    ro.observe(el);
    return () => ro.disconnect();
  }, [showBodySlide, updateArrows]);

  const scrollByDir = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
  };

  if (!showBodySlide) {
    return (
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 sm:p-5 shadow-md">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
          {L.sectionTitle}
        </h2>
        {radar}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 sm:p-5 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)] m-0">
          {L.sectionTitle}
        </h2>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            className="btn btn-secondary"
            aria-label={L.ariaPrev}
            disabled={!canPrev}
            onClick={() => scrollByDir(-1)}
            style={{
              minWidth: 44,
              minHeight: 40,
              padding: "0 12px",
              opacity: canPrev ? 1 : 0.45,
              cursor: canPrev ? "pointer" : "not-allowed",
            }}
          >
            ‹
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            aria-label={L.ariaNext}
            disabled={!canNext}
            onClick={() => scrollByDir(1)}
            style={{
              minWidth: 44,
              minHeight: 40,
              padding: "0 12px",
              opacity: canNext ? 1 : 0.45,
              cursor: canNext ? "pointer" : "not-allowed",
            }}
          >
            ›
          </button>
        </div>
      </div>

      <div className="relative -mx-1">
        <div
          ref={scrollerRef}
          onScroll={updateArrows}
          role="region"
          aria-label={L.sectionTitle}
          tabIndex={0}
          className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth pb-1"
          style={{
            WebkitOverflowScrolling: "touch",
            scrollbarGutter: "stable",
          }}
        >
          <div className="min-w-full shrink-0 snap-start box-border px-1">
            <p className="text-xs text-[var(--text-secondary)] mb-2 m-0">{L.slideRadarCaption}</p>
            {radar}
          </div>
          <div className="min-w-full shrink-0 snap-start box-border px-1">
            {L.slideBodyCaption.trim() ? (
              <p className="text-xs text-[var(--text-secondary)] mb-2 m-0">{L.slideBodyCaption}</p>
            ) : null}
            <div className="flex justify-center pt-1">
              <IllustrativeBodyAvatar
                formData={formForAvatar}
                assessedAtLabel={assessedAtLabel}
                captionOverride={L.studentAvatarCaption}
                neutralReference={neutralReference}
                bodyScaleFromProfile={profileBodyMetrics}
                showPoseTags
                show3dViewOption={allowLazyHumanoid3d}
                explainCaption={L.studentAvatarCaptionShort.trim() ? "tooltip" : "inline"}
                captionSummary={L.studentAvatarCaptionShort.trim() || null}
                humanoidFootnote={
                  allowLazyHumanoid3d && L.humanoid3dFootnoteShort.trim()
                    ? {
                        short: L.humanoid3dFootnoteShort,
                        detail: L.humanoid3dFootnoteDetail,
                        infoAria: L.infoTipAriaHumanoid3d,
                      }
                    : null
                }
                silhouetteInfoAria={L.infoTipAriaSilhouette.trim() || null}
                humanoid3dOrbitHint={allowLazyHumanoid3d && L.humanoid3dOrbitHint.trim() ? L.humanoid3dOrbitHint : null}
                bodyViewLabel2d={L.bodyViewLabel2d}
                bodyViewLabel3d={L.bodyViewLabel3d}
                bodyViewGroupAria={L.bodyViewGroupAria}
                className="max-w-[min(280px,92vw)]"
              />
            </div>
          </div>
        </div>
        {L.swipeHint.trim() ? (
          <p className="text-xs text-[var(--text-secondary)] mt-2 mb-0" style={{ lineHeight: 1.45 }}>
            {L.swipeHint}
          </p>
        ) : null}
      </div>
    </section>
  );
}
