"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AnatomicalBodyMap } from "@/components/physical-assessment/AnatomicalBodyMap";
import { BodyMapSkeletonInvite } from "@/components/physical-assessment/BodyMapSkeletonInvite";
import { InlineInfoTip } from "@/components/ui/InlineInfoTip";
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
  /** Aria-label do botão «i» quando o texto acima vai só para o tooltip. */
  bodyMapDisclaimerTipAria?: string;
};

const LABEL_DEFAULTS: PerformanceAvatarCarouselLabels = {
  sectionTitle: "Perfil de competências",
  slideRadarCaption: "Radar por dimensão (1–10)",
  slideBodyCaption: "Mapa corporal da ficha física",
  swipeHint: "",
  ariaPrev: "Anterior",
  ariaNext: "Seguinte",
  studentAvatarCaption: "",
  bodyMapDisclaimerTipAria: "",
};

function mergeLabels(labels?: PerformanceAvatarCarouselLabels | null): PerformanceAvatarCarouselLabels {
  return { ...LABEL_DEFAULTS, ...(labels ?? {}) };
}

/** Mapa corporal / convite à ficha (conteúdo do 2.º painel do carrossel), reutilizável na secção de dados biométricos. */
export function PhysicalAssessmentBodyMapPanel({
  payload,
  className,
}: {
  payload: PhysicalAvatarCarouselPayload;
  className?: string;
}) {
  const L = mergeLabels(payload.labels ?? null);
  const invite = Boolean(payload.invitePhysicalAssessment);
  const parsedForm = normalizePhysicalFormDataJson(payload.formData);
  const neutralReference = !payload.silhouettePersonalized;
  const formForMap = neutralReference ? (parsedForm ?? {}) : (parsedForm ?? payload.formData ?? {});
  const locale = payload.locale;
  const profileBodyMetrics = payload.profileBodyMetrics ?? null;
  const assessedAtLabel = payload.assessedAt?.trim() ? payload.assessedAt : null;

  return (
    <div
      className={[
        "mx-auto flex max-w-[min(360px,94vw)] flex-col items-center gap-2 pt-1",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {L.slideBodyCaption.trim() ? (
        <p className="m-0 mb-0 w-full text-xs text-[var(--text-secondary)]">{L.slideBodyCaption}</p>
      ) : null}
      {invite ? (
        <BodyMapSkeletonInvite locale={locale} scheduleHref={payload.inviteScheduleHref} className="w-full" />
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
        <div className="flex justify-center pt-0.5">
          <InlineInfoTip
            detail={L.studentAvatarCaption}
            ariaLabel={L.bodyMapDisclaimerTipAria?.trim() || "Info"}
          />
        </div>
      ) : null}
    </div>
  );
}

type Props = {
  radar: ReactNode;
  /** Quando `null`, só o radar é mostrado (sem 2.º painel). */
  payload: PhysicalAvatarCarouselPayload | null;
  /** Se `true`, não mostra o 2.º painel (mapa convite/ficha) — usar quando o mapa está doutro lado (ex.: dados biométricos). */
  radarOnly?: boolean;
  /** Texto curto sob o radar quando `radarOnly` (ex.: indicar que o mapa está na secção de dados biométricos). */
  radarOnlyHint?: string | null;
};

/**
 * Carrossel horizontal: 1.º painel radar; 2.º mapa corporal ilustrativo (ou convite com esqueleto se ainda não há ficha).
 */
export function PerformanceRadarAvatarCarousel({
  radar,
  payload,
  radarOnly = false,
  radarOnlyHint = null,
}: Props) {
  const L = mergeLabels(payload?.labels ?? null);

  const showBodySlide = Boolean(payload) && !radarOnly;

  const scrollerRef = useRef<HTMLDivElement>(null);
  const radarSlideRef = useRef<HTMLDivElement>(null);
  const bodySlideRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(showBodySlide);
  /** Só o slide ativo deve ditar a altura do carrossel — sem isto, o mapa corporal (mais alto)
   * estica o slide do radar mesmo estando fora de vista (altura de flex-row = a do maior filho). */
  const [activeIndex, setActiveIndex] = useState(0);
  const [slideHeight, setSlideHeight] = useState<number | undefined>(undefined);

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanPrev(scrollLeft > 4);
    setCanNext(scrollLeft < scrollWidth - clientWidth - 4);
    if (clientWidth > 0) setActiveIndex(Math.round(scrollLeft / clientWidth));
  }, []);

  useEffect(() => {
    updateArrows();
    const el = scrollerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => updateArrows());
    ro.observe(el);
    return () => ro.disconnect();
  }, [showBodySlide, updateArrows]);

  useEffect(() => {
    const activeEl = activeIndex === 0 ? radarSlideRef.current : bodySlideRef.current;
    if (!activeEl) return;
    const measure = () => setSlideHeight(activeEl.getBoundingClientRect().height);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(activeEl);
    return () => ro.disconnect();
  }, [activeIndex, showBodySlide]);

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
        {L.slideRadarCaption.trim() ? (
          <p className="m-0 mb-2 text-xs text-[var(--text-secondary)]">{L.slideRadarCaption}</p>
        ) : null}
        {radar}
        {radarOnly && radarOnlyHint?.trim() ? (
          <p className="m-0 mt-3 max-w-prose text-xs leading-relaxed text-[var(--text-secondary)]">
            {radarOnlyHint}
          </p>
        ) : null}
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
          className="flex items-start overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth pb-1"
          style={{
            WebkitOverflowScrolling: "touch",
            scrollbarGutter: "stable",
            height: slideHeight,
            transition: "height 0.2s ease",
          }}
        >
          <div ref={radarSlideRef} className="min-w-full shrink-0 snap-start box-border px-1">
            <p className="text-xs text-[var(--text-secondary)] mb-2 m-0">{L.slideRadarCaption}</p>
            {radar}
          </div>
          <div ref={bodySlideRef} className="min-w-full shrink-0 snap-start box-border px-1">
            <PhysicalAssessmentBodyMapPanel payload={payload!} />
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
