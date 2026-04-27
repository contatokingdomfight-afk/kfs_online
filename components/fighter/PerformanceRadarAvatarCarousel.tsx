"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AnatomicalBodyMap } from "@/components/physical-assessment/AnatomicalBodyMap";
import { BodyMapSkeletonInvite } from "@/components/physical-assessment/BodyMapSkeletonInvite";
import type { PhysicalAvatarCarouselPayload } from "@/lib/build-performance-physical-carousel";
import { normalizePhysicalFormDataJson } from "@/lib/illustrative-body-silhouette";

export type PerformanceAvatarCarouselLabels = {
  sectionTitle: string;
  slideRadarCaption: string;
  slideBodyCaption: string;
  swipeHint: string;
  ariaPrev: string;
  ariaNext: string;
  /** Texto longo sob o mapa (contexto da ficha / convite a completar medidas). */
  studentAvatarCaption: string;
};

const LABEL_DEFAULTS: PerformanceAvatarCarouselLabels = {
  sectionTitle: "Perfil de competências",
  slideRadarCaption: "Radar por dimensão (1–10)",
  slideBodyCaption: "Mapa corporal da ficha física",
  swipeHint: "",
  ariaPrev: "Anterior",
  ariaNext: "Seguinte",
  studentAvatarCaption: "",
};

function mergeLabels(labels?: PerformanceAvatarCarouselLabels | null): PerformanceAvatarCarouselLabels {
  return { ...LABEL_DEFAULTS, ...(labels ?? {}) };
}

type Props = {
  radar: ReactNode;
  /** Quando `null`, só o radar é mostrado (sem 2.º painel). */
  payload: PhysicalAvatarCarouselPayload | null;
};

/**
 * Carrossel horizontal: 1.º painel radar; 2.º mapa corporal ilustrativo (ou convite com esqueleto se ainda não há ficha).
 */
export function PerformanceRadarAvatarCarousel({ radar, payload }: Props) {
  const L = mergeLabels(payload?.labels ?? null);

  const showBodySlide = Boolean(payload);
  const invite = Boolean(payload?.invitePhysicalAssessment);
  const parsedForm = payload ? normalizePhysicalFormDataJson(payload.formData) : null;
  const neutralReference = payload ? !payload.silhouettePersonalized : true;
  const formForMap = neutralReference ? (parsedForm ?? {}) : (parsedForm ?? payload?.formData ?? {});

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

  const locale = payload!.locale;
  const profileBodyMetrics = payload!.profileBodyMetrics ?? null;
  const assessedAtLabel = payload!.assessedAt?.trim() ? payload!.assessedAt : null;

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
            <div className="flex flex-col items-center pt-1 gap-2 max-w-[min(360px,94vw)] mx-auto">
              {invite ? (
                <BodyMapSkeletonInvite locale={locale} scheduleHref={payload!.inviteScheduleHref} className="w-full" />
              ) : (
                <AnatomicalBodyMap
                  formData={formForMap}
                  locale={locale}
                  assessedAtLabel={assessedAtLabel}
                  variant="compact"
                  neutralReference={neutralReference}
                  profileBodyMetrics={profileBodyMetrics}
                  className="w-full border-0 bg-transparent p-0"
                />
              )}
              {L.studentAvatarCaption.trim() ? (
                <p className="text-xs text-[var(--text-secondary)] m-0 text-center leading-relaxed px-1">
                  {L.studentAvatarCaption}
                </p>
              ) : null}
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
